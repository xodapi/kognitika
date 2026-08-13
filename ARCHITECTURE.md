# Kognitika Core: Architectural Source of Truth

> Version: 1.5.0 | Updated: 2026-08-04 | Status: Stabilized MVP with staged analytics migration

---

## Current platform status

Kognitika is a React/Vite cognitive-training product with Express, Socket.io, Prisma, and PostgreSQL as its production authority. Trainer behavior is isolated in engine hooks, while the UI focuses on rendering, accessibility, and navigation.

TypeScript remains the runtime authority for cognitive analytics. The repository also contains `crates/kognitika-core`, a deterministic Rust implementation of the versioned `AnalyzeSession` contract. It is a compute-only shadow/canary candidate, not a replacement for the web client, Express, Prisma, PostgreSQL, authentication, or Socket.io.

The bounded-context vocabulary and aggregate consistency decisions are documented in
[`docs/domain-language.md`](docs/domain-language.md) and
[`docs/aggregate-boundaries.md`](docs/aggregate-boundaries.md).

---

## Module map

| Module | Engine hook | Local EventBus | Tests | Analytics boundary | Status |
|---|---|---|---|---|---|
| Schulte tables | `useSchulteEngine` | yes | yes | TypeScript / Worker-ready | Production |
| Typing speed | `useTypingEngine` | yes | yes | TypeScript / Worker-ready | Production |
| Spatial concealment | `useSpatialEngine` | yes | yes | TypeScript / Worker-ready | Production |
| N-Back | `useNBackEngine` | yes | yes | TypeScript | Production |
| Stroop | `useStroopEngine` | yes | yes | TypeScript | Production |
| Logical and numerical trainers | dedicated hooks | yes | yes | TypeScript | Production |
| Topology, collision, dispatcher | dedicated hooks | yes | yes | TypeScript | Production |
| Mind-Guard trainers | dedicated hooks | yes | module-specific | TypeScript | Production/Beta |
| Situational test | `useSituationalEngine` | yes | module-specific | TypeScript | Beta |
| Concentration Curve | UI widget | subscribes only | yes | UI visualization | Production |

The full trainer inventory evolves with the application. A new public module must follow the knowledge-base contract in `AGENTS.md`.

---

## Runtime boundaries

### Client interaction layer

```text
React component
  <-> use{Module}Engine
  <-> client EventBus
      -> event recorder
      -> local anti-fraud signal
      -> stability calculation
      -> difficulty suggestion
      -> development-safe logging
```

`src/client/analytics/event-bus.ts` creates a browser-only EventBus. It is synchronous and in-process. It supports local UI and engine feedback, but it does not persist events, retry deliveries, communicate with the server, or provide distributed tracing.

Components should not duplicate trainer rules. A frontend change is normally isolated when it preserves the relevant engine hook API and the meaning of its public event payloads. Engine, contract, or score changes require focused tests.

### Server domain layer

```text
Express route/middleware
  -> application repository port
  -> infrastructure Prisma adapter
  -> PostgreSQL authoritative transaction
  -> server EventBus
  -> best-effort subscribers
      -> session-summary persistence
      -> admin Telegram notifications
```

`src/server/events/event-bus.ts` is a separate Node-only in-process EventBus. It is not connected to the browser EventBus and is not a durable queue. Its subscribers run after an event is emitted and must tolerate failure, restart, duplicate attempts, and unavailable dependencies.

Socket.io is a separate real-time transport for Cognitive Flow and duels. It is not a replacement for the analytics outbox.
Like HTTP routes and middleware, Socket.io transports use application repository ports
for persistence and do not import the Prisma client directly.
Best-effort server subscribers follow the same rule for persistence reads needed to
produce notifications or other side effects.

Application repository ports live in `src/server/repositories`. Prisma implementations
live in `src/server/infrastructure/prisma`, and `src/server/infrastructure/container.ts`
is the composition root. Runtime HTTP routes and middleware must not import the Prisma
client directly. This preserves route-level validation, authorization, privacy
serialization, and response contracts while making persistence independently testable.

### Durable analytics boundary

```text
engine collector
  -> canonical completed-session job
  -> Node/Prisma game-save transaction + analytics_outbox metadata
  -> future Node dispatcher
  -> internal Rust sidecar in shadow mode
```

The canonical v1 event contract lives in `src/core/cognitive-events`. `CognitiveSessionEventCollector` is local and transport-free: it produces ordered, bounded, versioned, privacy-minimized session events and does not own identity, persistence, or network delivery. A legacy EventBus bridge exists only to migrate older event producers.

The opt-in `analytics_outbox` is Node/Prisma-owned. It supports idempotency keys, leases, bounded retries, dead-letter state, and aggregate-only operational metrics. A saved game must never wait for or depend on a Rust analysis result.

The currently registered `game:completed` subscriber still creates a summary job with `events: []`. That best-effort legacy path cannot produce event-level analysis and must be replaced by collector-backed delivery before analytics outputs are treated as behavior-level session analysis.

---

## Event contract classification

| Contract class | Examples | Delivery and ownership |
|---|---|---|
| UI-local | `CELL_CLICK`, `STABILITY_UPDATE`, `DIFFICULTY_SUGGESTION` | Client EventBus only, synchronous and non-durable |
| Server-domain | `game:completed`, feedback and idea notifications | Server EventBus after authoritative persistence, best effort |
| Durable analytics | `CognitiveInteractionEvent`, `CompletedSessionAnalyticsJob`, analytics outbox entry | Versioned canonical contract, Node/Prisma transaction and future dispatcher |

The legacy registry still includes some permissive `z.any()` events. They are compatibility debt, not a model for new features. New server-relevant and analytics events must use strict, minimal Zod schemas with explicit versions.

---

## Analytics and Rust boundary

### Current authority

- TypeScript core and server services produce runtime analytics today.
- `src/workers/analytics.worker.ts` keeps browser calculations off the React render path where applicable.
- `src/core/analyze-session` defines the TypeScript full-session analysis contract and fallback.
- `crates/kognitika-core` parses and analyzes the matching deterministic `AnalyzeSession` contract for native Rust and WASM.
- `crates/kognitika-analytics-sidecar` is internal-only and stateless. It has no database configuration, public ingress, or persistence ownership.

### Rust responsibilities

Rust may calculate deterministic, privacy-minimized inputs such as reaction-time distributions, speed slope, accuracy, fatigue, engagement, suspicious-pattern score, and recommendation signals.

Rust does not own:

- Brain ID, authentication, authorization, or sessions;
- Express routes, public APIs, or Socket.io;
- Prisma, PostgreSQL credentials, database writes, or migrations;
- game-save transactions, XP, leaderboards, or user ownership;
- React, web UI rendering, or mobile UI.

All analytics inputs, fixtures, logs, and outputs must reject or exclude raw Brain ID, user identity, email, credentials, tokens, raw storage, screenshots, free text, device identifiers, location, and raw wearable telemetry.

### Promotion path

```text
canonical engine events
  -> collector-backed completed job
  -> transactional Node outbox
  -> Node-mediated sidecar request
  -> TypeScript/Rust synthetic parity corpus
  -> shadow metrics
  -> feature-flagged canary
  -> Rust-primary AnalyzeSession with TypeScript fallback
```

The complete task sequence and acceptance gates are in [`docs/eventbus-rust-analytics-roadmap.md`](docs/eventbus-rust-analytics-roadmap.md). Browser WASM remains a separate Worker and frame-budget decision. It does not imply a React rewrite.

---

## Determinism and data ownership

### Seeded determinism

Generators for supported modules accept deterministic seeds where required. This makes tests reproducible and allows a task instance to be regenerated without persisting client-only runtime state.

### Data systems

| System | Responsibility |
|---|---|
| Prisma / PostgreSQL | Authoritative training sessions, XP, history, leaderboards, attempts, and outbox lifecycle |
| Express | API validation, authorization, game-save orchestration, and server-side services |
| Socket.io | Real-time Cognitive Flow and duel transport |
| Browser storage gateway | Auditable browser-local storage access |
| Node analytics outbox | Durable, retryable scheduling metadata for non-authoritative analytics work |
| Rust core / Axum sidecar | Deterministic analysis only, behind Node-mediated contracts |

Firebase is not part of the runtime architecture. Do not reintroduce Firebase Auth, Firestore, or Firebase client configuration without an explicit approved product and privacy decision.

---

## Delivery roadmap

- **Completed foundations:** typed in-process EventBus boundaries, canonical cognitive-event contract and collector, TypeScript/Rust `AnalyzeSession` contract, Node-owned outbox lifecycle, internal Axum sidecar boundary, synthetic fixture coverage.
- **Next implementation:** adopt the collector in each supported engine and replace empty-event legacy analytics jobs.
- **Then:** dispatch leased outbox work through a Node adapter, collect TypeScript/Rust parity metrics, and validate timeout/retry/version mapping.
- **Only after acceptance gates:** run a reversible shadow canary and consider Rust-primary `AnalyzeSession`.

Do not use EventBus as a durable queue. Do not allow sidecar failure to block a game save.

---

## Verification expectations

Before committing, run the narrowest relevant checks. For production-risk work, run the repository validation commands required by the changed surface, including type checking, tests, and build where applicable.

For EventBus/Rust analytics changes, validate the relevant contract, collector, bridge, outbox, Prisma outbox, game-save, and TypeScript/Rust parity tests. Rust changes additionally require formatting, Clippy with warnings denied, and Rust tests. Documentation-only architecture updates require whitespace validation and the relevant boundary test.
