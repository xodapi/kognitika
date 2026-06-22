# AnalyzeSession Browser Worker Frame-Budget Benchmark

Date: 2026-06-22T00:49:30.230Z

Related issue: #108

## Summary

This benchmark compares the existing TypeScript fallback running on the browser
main thread with the Rust/WASM implementation running inside a browser Worker.
It uses Vite and Playwright/Chromium so the result reflects browser scheduling
and Worker isolation more closely than the Node Worker benchmark in #106.

Synthetic fixtures only were used. No real user data, raw Brain ID, tokens,
emails, screenshots, raw storage, or private telemetry are included.

## Method

- Browser: Chromium via Playwright
- Fixtures: 3
- Iterations per fixture: 3000
- Total sessions per implementation: 9000
- WASM build command: `wasm-pack build crates/kognitika-core --target web --release`
- Benchmark command: `pnpm benchmark:analyze-session:browser`

## Throughput

| Implementation | Init ms | Total ms | Per session ms | Sessions/sec | Parity |
| --- | ---: | ---: | ---: | ---: | --- |
| TypeScript fallback main thread | 0 | 445.6 | 0.049511 | 20197.49 | source of truth |
| Rust/WASM browser Worker | 41.6 | 606 | 0.067333 | 14851.49 | ok |

## Frame Budget

| Implementation | Frames | p95 delta ms | p99 delta ms | Max delta ms | Dropped frames | Long tasks | Max long task ms | Smoke budget |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| TypeScript fallback main thread | 1 | 433.2 | 433.2 | 433.2 | 1 | 1 | 446 | fail |
| Rust/WASM browser Worker | 41 | 16.8 | 16.8 | 16.8 | 0 | 0 | 0 | pass |

## Optional WASM Asset Impact

| Asset | Bytes |
| --- | ---: |
| JS glue | 7141 |
| WASM binary | 146659 |
| Total | 153800 |

## Decision

Worker isolation helps frame budget, but Rust/WASM is not clearly faster. Prefer moving heavy analysis off the main thread first; do not switch the production web runtime to WASM yet.

## Next Step

Do not switch production web runtime to WASM from this benchmark alone. If we
continue, test a heavier real analytical batch or move the same contract into a
server-side analytics job where Rust has a clearer workload advantage.
