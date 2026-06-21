# Kognitika Mobile, Rust Core, And WASI Research

Date: 2026-06-21

Related issues: #102, #85, #89, #93

## Decision Summary

Kognitika should plan for a native mobile client, but should not rewrite the
existing web product into React Native or Rust UI. The right architecture is a
shared cognitive core with explicit contracts, while keeping each runtime
honest about what it does best:

- Web: React/Vite remains the production client.
- Mobile: Expo/React Native should become a separate native client.
- Server: the current Express/Prisma/PostgreSQL path remains the authority for
  Brain ID, auth, persistence, admin, and deploy stability.
- Rust: introduce only behind measured, deterministic core boundaries.
- WASI: evaluate for server-side sandboxed components and portable analytics,
  not for Expo Go or UI rendering.

The first Rust candidate should be `analyzeSession(events)`, not authorization
or a full trainer rewrite. It directly supports click-speed dynamics,
abandonment/engagement analytics, anti-fraud signals, cognitive ability curves,
and server/client parity.

## Current Kognitika Fit

The repo already has the right seams for a future Rust core:

- `src/core/events/event-schema.ts` defines `CELL_CLICK`,
  `TRAINING_COMPLETE`, and `PRACTICE_RECOMMENDED`.
- `src/lib/practice-flow-analytics.ts` defines privacy-safe flow events and
  summary aggregation.
- `src/lib/frame-budget.ts` defines the performance gate for frame-critical
  routes.
- `src/server/services/game-score.ts` centralizes server-side scoring so the
  server does not trust client scores.
- `docs/frame-budget-benchmark.md` already says Rust/WASM must be measured and
  kept behind a worker boundary.

This means we can create a Rust core without moving everything at once.

## What "Rust Core" Should Mean

Use Rust for deterministic domain computation:

1. Session analysis
   - click/reaction-time distributions;
   - speed change during a task;
   - fatigue, hesitation, burst patterns;
   - missed/false-positive patterns;
   - abandonment risk and engagement depth.

2. Scoring and anti-fraud
   - server-side score normalization;
   - impossible reaction-time detection;
   - repeated answer-pattern detection;
   - consistency checks across sessions.

3. Task generation
   - deterministic generators for Schulte/N-back/Stroop/Numerical variants;
   - seed-based reproducibility;
   - same generated task on web, mobile, and server.

4. Cognitive curve aggregation
   - ability trend by module/category;
   - daily trajectory summary;
   - recommendation effectiveness.

Do not start with:

- full auth/session ownership;
- PostgreSQL access from WASI;
- UI rendering;
- replacing React, Express, Prisma, or Expo.

## Recommended First Kernel

```ts
type AnalyzeSessionInput = {
  schemaVersion: 1;
  moduleId: string;
  category: 'cognitive' | 'somatic' | 'safety';
  startedAt: string;
  completedAt?: string;
  events: Array<{
    tMs: number;
    kind: 'click' | 'answer' | 'mistake' | 'checkpoint';
    reactionTimeMs?: number;
    isCorrect?: boolean;
    x?: number;
    y?: number;
    checkpoint?: string;
  }>;
};

type AnalyzeSessionOutput = {
  schemaVersion: 1;
  durationMs: number;
  clickCount: number;
  p50ReactionMs: number;
  p95ReactionMs: number;
  speedSlope: number;
  accuracy: number;
  fatigueIndex: number;
  engagementIndex: number;
  suspiciousPatternScore: number;
  recommendationSignals: Array<'weak_area' | 'streak_maintenance' | 'variety' | 'recovery'>;
};
```

Acceptance for the first kernel:

- TypeScript fallback exists first.
- Golden fixtures are synthetic only.
- Rust output equals TypeScript output on fixtures.
- Web calls it from a Worker, never React render.
- Server can call the same contract for verification.
- Mobile can call either TypeScript fallback or native Rust binding later.

## WASI Findings For Kognitika

WASI is valuable, but not in the same place as browser WASM or mobile native
Rust.

### What changed recently

WASI 0.3 was announced by the Bytecode Alliance in June 2026. The important
change is native async in WebAssembly Components: `future<T>`, `stream<T>`, and
`async func` are now part of the Component Model ABI, with the host runtime
managing scheduling across composed components.

For Kognitika, this makes WASI more interesting for server-side plugin-style
components because async APIs are no longer a clumsy wrapper pattern. It does
not make WASI a direct replacement for React Native, Expo Go, or browser UI.

### Strong WASI use cases

- Server-side analytics plugins loaded by Wasmtime.
- Sandboxed trainer/scoring modules with explicit WIT contracts.
- Running untrusted or experimental cognitive modules with limited capabilities.
- Future partner/research modules where we want portable computation without
  giving direct database/network access.
- Batch processing jobs where reproducibility matters.

### Weak WASI use cases

- Expo Go. Expo Go cannot include arbitrary native runtime pieces after install.
- Mobile UI. React Native/Expo still needs native modules or JS/TS logic.
- Brain ID auth as the first migration. Auth is DB, secrets, rate limits,
  audit, and operational safety; moving it early increases risk.
- Direct PostgreSQL business services. Current WASI ecosystem can do HTTP and
  system-like capabilities, but mature DB/service ownership is not the first
  thing to bet the product on.

## Mobile Native Path

Expo is still a good candidate for the mobile client, but Rust integration
changes the Expo decision:

- Expo Go is fine for a pure JS/React Native prototype.
- Custom Rust/native modules require a development build or production build.
- Expo Modules API is the ergonomic route for Swift/Kotlin native modules.
- Turbo Modules are better if we need lower-level C++/JSI access.
- A Rust mobile core should likely be exposed through native bindings, not WASI.

Practical path:

1. Build mobile prototype in Expo with TypeScript shared contracts.
2. Keep Brain ID tokens in `expo-secure-store`, not async storage.
3. Add native Rust only after one kernel contract is stable.
4. Use Expo Dev Client for Rust/native integration tests.

## Backend/Auth Path

Could auth and user accounting move to Rust eventually? Yes. Should it move now?
No.

Reasons:

- Current public auth is already Brain ID-first and server-authoritative.
- Prisma/PostgreSQL is already the runtime source of truth.
- Auth bugs are high-risk and user-visible.
- Rust backend migration would not solve the current mobile/native need.

If we later want Rust backend ownership, do it as a separate service rewrite
decision:

```text
Express API gateway
  -> Rust identity/scoring service
  -> PostgreSQL
```

or:

```text
Rust API service
  -> PostgreSQL
  -> same public contracts
```

That decision must have API parity tests, migration plan, rollback, and
observability before touching production auth.

## Proposed Core Architecture

```text
                        +---------------------+
                        |  PostgreSQL/Prisma  |
                        +----------+----------+
                                   |
                             server authority
                                   |
+--------------+          +--------v--------+          +----------------+
| React Web    |  events  | Express API     |  jobs    | WASI sandbox   |
| Worker       +----------> Brain ID/Auth   +----------> components     |
| TS fallback  |          | Persistence     |          | analytics      |
+------+-------+          +--------+--------+          +----------------+
       |                           ^
       | same contracts            |
       v                           |
+--------------+          +--------+--------+
| Rust/WASM    |          | Expo Mobile     |
| web kernel   |          | TS fallback     |
| optional     |          | native Rust later|
+--------------+          +-----------------+
```

The stable asset is the contract, not a single runtime.

## Package Shape To Evaluate

```text
packages/
  core-contracts/
    src/session-analysis.ts
    src/events.ts
    fixtures/synthetic/*.json

crates/
  kognitika-core/
    src/session_analysis.rs
    src/scoring.rs
    src/generators.rs

apps/
  mobile/
    Expo app, TypeScript contracts first
```

Possible compile targets:

- Web: `wasm32-unknown-unknown` with `wasm-bindgen`, loaded in a Worker.
- Server sandbox: `wasm32-wasip2` or future WASI 0.3 component, loaded by
  Wasmtime.
- Mobile: native Rust library through Swift/Kotlin bridge, Expo Module, or
  Turbo Module. Do not assume WASI on mobile.

## Go / No-Go

Go:

- Create a TypeScript `analyzeSession(events)` contract and golden fixtures.
- Create a Rust spike only after TS fixtures and frame-budget baseline exist.
- Use WASI research for server-side sandboxing/plugin architecture.
- Start Expo native mobile prototype with Brain ID + one trainer, using TS
  contracts first.

No-go:

- No full rewrite to Rust.
- No auth migration to Rust in the same sprint as mobile.
- No WASI dependency in the mobile app.
- No UI rewrite to Rust/egui for production.
- No Rust kernel without JS/TS fallback.

## Agent Command For The Next Spike

```text
Take issue #102. Do not rewrite the app. Implement a research-to-code spike:
1. Create a typed TypeScript AnalyzeSession contract under shared/core.
2. Add synthetic golden fixtures for CELL_CLICK and PracticeFlow events.
3. Implement a pure TypeScript fallback analyzer.
4. Add tests for speed slope, p50/p95 reaction time, fatigue index, and suspicious pattern score.
5. Do not add Rust yet unless the contract and tests are stable.
6. Document how the same contract would compile to Rust/WASM, WASI component, and mobile native binding.
No production/server changes and no real user data.
```

## Sources

- Bytecode Alliance: WASI 0.3 announcement and async Component Model:
  https://bytecodealliance.org/articles/WASI-0.3
- Bytecode Alliance Component Model documentation:
  https://component-model.bytecodealliance.org/
- Wasmtime documentation:
  https://docs.wasmtime.dev/
- Rust `wasm32-wasip2` platform support:
  https://doc.rust-lang.org/rustc/platform-support/wasm32-wasip2.html
- Expo development builds:
  https://docs.expo.dev/develop/development-builds/introduction/
- Expo SecureStore:
  https://docs.expo.dev/versions/latest/sdk/securestore/
- Expo Modules API:
  https://docs.expo.dev/modules/overview/
