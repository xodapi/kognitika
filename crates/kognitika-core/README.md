# kognitika-core

Deterministic Rust core for Kognitika full-session cognitive analysis.

`kognitika-core` implements the versioned `AnalyzeSession` contract for both native Rust and WebAssembly. It is the first computational boundary on the planned path to server-side Rust analytics, but it is **not yet the production authority**: the current runtime remains JavaScript/TypeScript while Rust is prepared for shadow and canary rollout.

## Current boundary

- Native API: `parse_analyze_session_input` and `analyze_session`.
- WASM API: `analyzeSessionJson` via `wasm-bindgen` on `wasm32`.
- Contract source: `src/core/analyze-session/session-analysis.ts`.
- Shared validation corpus: `fixtures/analyze-session/contract-cases.json`.
- Current browser runtime: JS/TypeScript worker and server services.

The lightweight browser `ClickEvent` contract and the full-session `AnalyzeSession` contract are currently distinct. Do not treat this crate as a drop-in replacement for the existing browser worker without an explicit adapter and rollout gate.

## Contract safeguards

Before analysis, Rust rejects:

- sensitive identity, credential, storage, screenshot, or token-like keys;
- unknown fields;
- invalid IDs, module IDs, RFC3339 timestamps, event limits, reaction times, coordinates, and checkpoints;
- completed sessions longer than 24 hours.

The 24-hour maximum matches the `tMs` boundary and prevents `durationMs` narrowing overflow. Payloads are synthetic in tests and fixtures, never real user telemetry.

## Local verification

From the repository root:

```bash
cargo fmt --manifest-path crates/kognitika-core/Cargo.toml -- --check
cargo clippy --manifest-path crates/kognitika-core/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path crates/kognitika-core/Cargo.toml
cargo check --manifest-path crates/kognitika-core/Cargo.toml --target wasm32-unknown-unknown
pnpm test src/tests/analyze-session-core.test.ts src/tests/analyze-session-v2-fixtures.test.ts src/tests/analyze-session-contract-parity.test.ts
```

To benchmark the TypeScript implementation against a Worker/WASM build, using synthetic fixtures only:

```bash
pnpm benchmark:analyze-session
pnpm benchmark:analyze-session:browser
```

## Migration direction

The Rust roadmap is tracked in [issue #139](https://github.com/xodapi/kognitika/issues/139):

1. canonical events for all cognitive modules;
2. durable analytics jobs;
3. native Rust/Axum analyzer in shadow mode;
4. canary rollout with TypeScript fallback;
5. Rust-primary session analysis and later longitudinal skill dynamics.

Browser WASM remains a separate frame-budget decision. Existing benchmarks show that Worker isolation improves browser responsiveness, while Rust/WASM is not automatically faster for short sessions.

## Non-goals

This crate does not own Brain ID, authentication, Prisma/PostgreSQL writes, Express routes, Socket.io, game-save transactions, or React UI. It must not introduce raw Brain ID, email, tokens, screenshots, raw storage, or private telemetry into analytics inputs, fixtures, logs, or outputs.
