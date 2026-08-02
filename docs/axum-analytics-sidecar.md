# Internal Axum analytics sidecar

`crates/kognitika-analytics-sidecar` is a stateless, internal-only Rust service around `kognitika-core`. It is a shadow-capable analysis boundary only. Express and TypeScript remain authoritative for game saves and analytics decisions.

## Endpoints

- `POST /internal/v1/analyze-session`: accepts an `AnalyzeSession v1` payload and returns the existing `kognitika-core` result.
- `GET /health/ready`: readiness response.
- `GET /health/live`: liveness response.
- `GET /metrics`: aggregate request counters only. No identifier, payload, or telemetry labels are emitted.

The listener defaults to `127.0.0.1:3010`, and may be changed with `ANALYTICS_SIDECAR_ADDR`. There is no database configuration, authentication state, public ingress, or persistence layer. Local compose does not publish host ports; production ingress is not configured by this crate.

## Failure behavior and rollback

Invalid, oversized, unsupported-version, and sensitive-field payloads return `400 {"error":"invalid_payload"}`. Panics are isolated to the request and return `500 {"error":"analysis_failed"}`. Each request has a two-second timeout. Ctrl-C begins graceful Axum shutdown.

Rollback is disable-only: stop the sidecar or remove its caller. Do not route game saves or authoritative TypeScript results through the service.

## Validation

```sh
cargo fmt --manifest-path crates/kognitika-analytics-sidecar/Cargo.toml -- --check
cargo clippy --manifest-path crates/kognitika-analytics-sidecar/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path crates/kognitika-analytics-sidecar/Cargo.toml
```

## Reproducible 10,000-event sidecar baseline

The deterministic benchmark generates a synthetic, non-sensitive 10,000-event payload and sends it through the in-process Axum route. It does not start a listener, require PostgreSQL or Express, or make network calls. It prints only aggregate latency, p95, and p99, and is intentionally not a mandatory CI performance gate.

```sh
cargo run --release --manifest-path crates/kognitika-analytics-sidecar/Cargo.toml --bin sidecar-benchmark
```

No production SLO is implied until a baseline is captured on the intended deployment hardware.
