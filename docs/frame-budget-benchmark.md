# Frame Budget Benchmark

This document defines the Kognitika performance benchmark track for interaction-heavy training screens.

## Targets

- 60 FPS frame budget: about `16.67ms` per frame.
- App work target: keep Kognitika-owned work below `8-10ms` during frame-critical interactions where feasible.
- Long task warning threshold: browser tasks above `50ms`.
- Input-to-feedback smoke target: p95 below `100ms` in automated smoke checks, with a product target of `50ms` for reaction-heavy modules.

These targets are diagnostic gates. They are not a product claim that every Kognitika screen redraws at 60 FPS.

## Frame-Critical Screens

Frame budget matters most for:

- `/schulte`
- `/stroop`
- `/nback`
- `/typing`
- `/spatial`
- `/topology`
- `/collision`
- `/dispatcher`
- `/noise`
- `/scanner`
- `/decryptor`
- `/reality`
- `/numerical`

Frame budget is not the primary optimization target for:

- `/admin`
- `/wiki`
- `/ideas`
- `/leaderboard`
- dashboard/profile views

Those screens should optimize clarity, load time, accessibility, and layout stability.

## What The Harness Captures

`src/lib/frame-budget.ts` provides a browser benchmark harness and pure summary functions for:

- dropped frames from `requestAnimationFrame` deltas;
- long tasks through `PerformanceObserver` when supported;
- p95/p99 input-to-feedback latency from input events to the next frame;
- smoke-pass status for automated regression checks.

The harness records timings only. It must not record email, Brain ID, tokens, raw storage, screenshots, free-form user text, or private telemetry.

## Rust/WASM Gate

Do not start a Rust UI rewrite from this benchmark alone.

Before any Rust/WASM hot-path implementation:

1. Run this benchmark on the current React implementation.
2. Identify a concrete bottleneck and route.
3. Prove that analytics/scoring blocks frame-critical interaction.
4. Add a JS fallback and golden fixtures.
5. Keep WASM inside a worker boundary, not React's main render path.

The first safe candidate is a measured `analyzeSession(events)` WASM spike, not a UI rewrite.

## Verification

Useful commands:

```bash
pnpm test src/tests/frame-budget.test.ts
pnpm test:e2e tests/frame-budget.spec.ts
pnpm lint
pnpm build
pnpm check:bundle
```
