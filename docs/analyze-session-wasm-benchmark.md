# AnalyzeSession Rust/WASM Worker Benchmark

Date: 2026-06-21T14:57:15.729Z

Related issue: #106

## Summary

This benchmark compares the existing TypeScript fallback for
`AnalyzeSession` with the Rust/WASM implementation loaded through a Node
Worker boundary. The Worker is used as a local stand-in for the browser Worker
architecture decision: Rust/WASM must not run directly inside React render.

Synthetic fixtures only were used. No real user data, raw Brain ID, tokens,
emails, screenshots, raw storage, or private telemetry are included.

## Method

- Fixtures: 3
- Iterations per fixture: 5000
- Total sessions per implementation: 15000
- WASM build command: `wasm-pack build crates/kognitika-core --target nodejs --release`
- TS command: `pnpm benchmark:analyze-session`

## Results

| Implementation | Init ms | Total ms | Per session ms | Sessions/sec | Parity |
| --- | ---: | ---: | ---: | ---: | --- |
| TypeScript fallback | 0 | 1473.6492 | 0.098243 | 10178.81 | source of truth |
| Rust/WASM Worker | 10.3844 | 2301.6409 | 0.153443 | 6517.09 | ok |

## Decision

Parity is confirmed through the Worker boundary. Treat Rust/WASM as a candidate for heavier batch/session analysis, but keep TypeScript as the default web runtime until browser Worker frame-budget measurements justify integration.

## Next Step

Do not switch production web runtime to WASM yet. If we continue, the next
step is a browser Worker benchmark in Vite/Playwright that measures main-thread
frame budget, cold-load cost, and bundle impact on real routes.
