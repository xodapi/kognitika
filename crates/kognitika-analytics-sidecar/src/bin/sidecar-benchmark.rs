use axum::http::Method;
use http_body_util::BodyExt;
use kognitika_analytics_sidecar::{app, request};
use serde_json::json;
use std::time::Instant;
use tower::ServiceExt;

const EVENT_COUNT: u32 = 10_000;
const ITERATIONS: usize = 25;

fn payload() -> String {
    let events = (0..EVENT_COUNT)
        .map(|index| {
            json!({
                "tMs": index * 10,
                "kind": if index % 10 == 0 { "answer" } else { "click" },
                "reactionTimeMs": 100 + (index % 300),
                "isCorrect": index % 7 != 0,
                "x": (index % 100) as f64 / 100.0,
                "y": ((index / 100) % 100) as f64 / 100.0,
            })
        })
        .collect::<Vec<_>>();

    serde_json::to_string(&json!({
        "schemaVersion": 1,
        "sessionId": "synthetic.sidecar-benchmark-10000",
        "moduleId": "schulte",
        "category": "cognitive",
        "startedAt": "2026-01-01T00:00:00Z",
        "completedAt": "2026-01-01T00:01:40Z",
        "events": events,
    }))
    .expect("synthetic benchmark payload is serializable")
}

fn percentile_ns(sorted: &[u128], numerator: usize, denominator: usize) -> u128 {
    let index = (sorted.len() * numerator)
        .div_ceil(denominator)
        .saturating_sub(1);
    sorted[index]
}

#[tokio::main]
async fn main() {
    let payload = payload();
    let mut durations = Vec::with_capacity(ITERATIONS);

    for _ in 0..ITERATIONS {
        let started = Instant::now();
        let response = app()
            .oneshot(request(
                Method::POST,
                "/internal/v1/analyze-session",
                payload.clone(),
            ))
            .await
            .expect("sidecar response");
        assert!(
            response.status().is_success(),
            "synthetic request must succeed"
        );
        let _ = response.into_body().collect().await.expect("response body");
        durations.push(started.elapsed().as_nanos());
    }

    durations.sort_unstable();
    let aggregate_ms = durations.iter().sum::<u128>() as f64 / 1_000_000.0;
    let p95_ms = percentile_ns(&durations, 95, 100) as f64 / 1_000_000.0;
    let p99_ms = percentile_ns(&durations, 99, 100) as f64 / 1_000_000.0;

    println!("aggregate_duration_ms={aggregate_ms:.3}");
    println!("p95_duration_ms={p95_ms:.3}");
    println!("p99_duration_ms={p99_ms:.3}");
}
