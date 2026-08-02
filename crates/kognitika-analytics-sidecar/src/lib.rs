use axum::{
    body::Body,
    error_handling::HandleErrorLayer,
    extract::{rejection::JsonRejection, DefaultBodyLimit, State},
    http::{header::CONTENT_TYPE, HeaderValue, Request, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use kognitika_core::{analyze_session, parse_analyze_session_input, AnalyzeSessionError};
use serde::Serialize;
use serde_json::Value;
use std::{
    sync::atomic::{AtomicU64, Ordering},
    sync::Arc,
    time::Duration,
};
use tower::timeout::TimeoutLayer;

const MAX_BODY_BYTES: usize = 1_048_576;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(2);

#[derive(Clone, Default)]
pub struct AppState {
    requests_total: Arc<AtomicU64>,
    requests_rejected_total: Arc<AtomicU64>,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: &'static str,
}

pub fn app() -> Router {
    let state = AppState::default();
    Router::new()
        .route("/internal/v1/analyze-session", post(analyze))
        .route("/health/ready", get(ready))
        .route("/health/live", get(live))
        .route("/metrics", get(metrics))
        .layer(DefaultBodyLimit::max(MAX_BODY_BYTES))
        .layer(
            tower::ServiceBuilder::new()
                .layer(HandleErrorLayer::new(
                    |_: Box<dyn std::error::Error + Send + Sync>| async {
                        StatusCode::REQUEST_TIMEOUT
                    },
                ))
                .layer(TimeoutLayer::new(REQUEST_TIMEOUT)),
        )
        .with_state(state)
}

async fn analyze(
    State(state): State<AppState>,
    payload: Result<Json<Value>, JsonRejection>,
) -> Response {
    state.requests_total.fetch_add(1, Ordering::Relaxed);

    let Json(payload) = match payload {
        Ok(payload) => payload,
        Err(_) => {
            state
                .requests_rejected_total
                .fetch_add(1, Ordering::Relaxed);
            return (
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "invalid_payload",
                }),
            )
                .into_response();
        }
    };

    let result = std::panic::catch_unwind(|| {
        let input = parse_analyze_session_input(payload)?;
        Ok::<_, AnalyzeSessionError>(analyze_session(&input))
    });

    match result {
        Ok(Ok(output)) => Json(output).into_response(),
        Ok(Err(error)) => {
            state
                .requests_rejected_total
                .fetch_add(1, Ordering::Relaxed);
            error_response(error)
        }
        Err(_) => {
            state
                .requests_rejected_total
                .fetch_add(1, Ordering::Relaxed);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: "analysis_failed",
                }),
            )
                .into_response()
        }
    }
}

fn error_response(error: AnalyzeSessionError) -> Response {
    let code = match error {
        AnalyzeSessionError::SensitiveField => "invalid_payload",
        AnalyzeSessionError::InvalidSchema(_) => "invalid_payload",
    };
    (StatusCode::BAD_REQUEST, Json(ErrorResponse { error: code })).into_response()
}

async fn ready() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ready" })
}

async fn live() -> Json<HealthResponse> {
    Json(HealthResponse { status: "live" })
}

async fn metrics(State(state): State<AppState>) -> Response {
    let body = format!(
        "# TYPE kognitika_analytics_requests_total counter\nkognitika_analytics_requests_total {}\n# TYPE kognitika_analytics_requests_rejected_total counter\nkognitika_analytics_requests_rejected_total {}\n",
        state.requests_total.load(Ordering::Relaxed),
        state.requests_rejected_total.load(Ordering::Relaxed),
    );
    let mut response = body.into_response();
    response.headers_mut().insert(
        CONTENT_TYPE,
        HeaderValue::from_static("text/plain; version=0.0.4"),
    );
    response
}

pub async fn serve(listener: tokio::net::TcpListener) -> std::io::Result<()> {
    axum::serve(listener, app())
        .with_graceful_shutdown(shutdown_signal())
        .await
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}

pub fn request(method: axum::http::Method, uri: &str, body: impl Into<Body>) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri)
        .header(CONTENT_TYPE, "application/json")
        .body(body.into())
        .expect("valid request")
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Method;
    use http_body_util::BodyExt;
    use serde::Deserialize;
    use tower::ServiceExt;

    const VALID: &str = r#"{"schemaVersion":1,"sessionId":"test-1","moduleId":"schulte","category":"cognitive","startedAt":"2026-01-01T00:00:00Z","completedAt":"2026-01-01T00:00:01Z","events":[{"tMs":100,"kind":"click","reactionTimeMs":100,"isCorrect":true}]}"#;
    const CONTRACT_CASES: &str = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../fixtures/analyze-session/contract-cases.json"
    ));
    const DOCKERFILE: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/Dockerfile"));
    const LOCAL_COMPOSE: &str =
        include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/compose.local.yml"));

    #[derive(Deserialize)]
    struct ContractCase {
        valid: bool,
        input: Value,
    }

    async fn response_body(response: Response) -> String {
        String::from_utf8(
            response
                .into_body()
                .collect()
                .await
                .expect("body readable")
                .to_bytes()
                .to_vec(),
        )
        .expect("utf8")
    }

    #[tokio::test]
    async fn analyzes_valid_contract_payload() {
        let response = app()
            .oneshot(request(Method::POST, "/internal/v1/analyze-session", VALID))
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::OK);
        assert!(response_body(response).await.contains("\"clickCount\":1"));
    }

    #[tokio::test]
    async fn matches_shared_contract_corpus_over_http() {
        let cases: Vec<ContractCase> = serde_json::from_str(CONTRACT_CASES).expect("valid corpus");

        for contract_case in cases {
            let expected = parse_analyze_session_input(contract_case.input.clone());
            let response = app()
                .oneshot(request(
                    Method::POST,
                    "/internal/v1/analyze-session",
                    serde_json::to_string(&contract_case.input).expect("serializable corpus input"),
                ))
                .await
                .expect("response");

            match expected {
                Ok(input) if contract_case.valid => {
                    assert_eq!(response.status(), StatusCode::OK);
                    let actual: Value = serde_json::from_str(&response_body(response).await)
                        .expect("sidecar JSON response");
                    assert_eq!(
                        actual,
                        serde_json::to_value(analyze_session(&input))
                            .expect("serializable core output")
                    );
                }
                Err(_) if !contract_case.valid => {
                    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
                    assert_eq!(
                        response_body(response).await,
                        r#"{"error":"invalid_payload"}"#
                    );
                }
                Ok(_) => panic!("corpus case marked invalid but accepted by core"),
                Err(_) => panic!("corpus case marked valid but rejected by core"),
            }
        }
    }

    #[tokio::test]
    async fn exposes_non_sensitive_validation_errors() {
        for payload in ["{", r#"{"schemaVersion":2}"#, r#"{"brainId":"never-log"}"#] {
            let response = app()
                .oneshot(request(
                    Method::POST,
                    "/internal/v1/analyze-session",
                    payload,
                ))
                .await
                .expect("response");
            assert_eq!(response.status(), StatusCode::BAD_REQUEST);
            assert_eq!(
                response_body(response).await,
                r#"{"error":"invalid_payload"}"#
            );
        }
    }

    #[tokio::test]
    async fn rejects_oversized_payloads_before_analysis() {
        let oversized = format!("{{\"padding\":\"{}\"}}", "x".repeat(MAX_BODY_BYTES));
        let response = app()
            .oneshot(request(
                Method::POST,
                "/internal/v1/analyze-session",
                oversized,
            ))
            .await
            .expect("response");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        assert_eq!(
            response_body(response).await,
            r#"{"error":"invalid_payload"}"#
        );
    }

    #[test]
    fn container_configuration_preserves_internal_boundary() {
        let combined = format!("{DOCKERFILE}\n{LOCAL_COMPOSE}").to_ascii_lowercase();
        for prohibited in [
            "database_url",
            "postgres_user",
            "postgres_password",
            "postgres_db",
            "depends_on:",
            "volumes:",
        ] {
            assert!(
                !combined.contains(prohibited),
                "container configuration contains {prohibited}"
            );
        }
        assert!(!LOCAL_COMPOSE.contains("\n    ports:"));
        assert!(DOCKERFILE.contains("USER analytics"));
        assert!(DOCKERFILE.contains("ANALYTICS_SIDECAR_ADDR=0.0.0.0:3010"));
        assert!(LOCAL_COMPOSE.contains("ANALYTICS_SIDECAR_ADDR: 0.0.0.0:3010"));
        assert!(LOCAL_COMPOSE
            .to_ascii_lowercase()
            .contains("local compose does not publish host ports"));
        assert!(LOCAL_COMPOSE
            .to_ascii_lowercase()
            .contains("production ingress is not configured by this crate"));
    }

    #[tokio::test]
    async fn supports_health_and_privacy_safe_metrics() {
        let service = app();
        let ready = service
            .clone()
            .oneshot(request(Method::GET, "/health/ready", Body::empty()))
            .await
            .expect("response");
        assert_eq!(ready.status(), StatusCode::OK);
        let metrics = service
            .oneshot(request(Method::GET, "/metrics", Body::empty()))
            .await
            .expect("response");
        let body = response_body(metrics).await;
        assert!(body.contains("requests_total"));
        assert!(!body.contains("sessionId"));
    }
}
