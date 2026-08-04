# EventBus and Rust analytics implementation roadmap

**Status:** active implementation plan

**Scope:** versioned cognitive-session analytics only

**Tracking:** Rust migration direction is also tracked in [#139](https://github.com/xodapi/kognitika/issues/139).

## Objective

Deliver a reliable, privacy-minimized path from a trainer engine interaction to a versioned session analysis, without turning the in-process EventBus into a queue or moving Node's product authority into Rust.

```text
trainer engine collector
  -> canonical cognitive session contract
  -> Node/Prisma game-save transaction + durable outbox
  -> Node dispatcher and adapter
  -> internal Rust sidecar in shadow mode
  -> TypeScript/Rust parity decision
  -> canary and controlled promotion
```

## Ownership and invariants

| Area | Owner | Invariant |
|---|---|---|
| UI state, local feedback, accessibility | React and engine hooks | Browser EventBus stays local and synchronous. |
| Canonical session event collection | TypeScript core, emitted by engines | Events are versioned, ordered, bounded, and privacy-minimized. |
| Save authorization, idempotency, DB transactions, retries | Node, Express, Prisma, PostgreSQL | Rust has no database credentials and cannot block an authoritative save. |
| Deterministic session calculation | TypeScript fallback, then `kognitika-core` Rust shadow | Rust is not authoritative until parity and canary gates pass. |
| Public APIs and realtime duels | Express and Socket.io | No API, authentication, or Socket.io rewrite is included. |

Never include raw Brain ID, user ID in analytics payloads, email, tokens, credentials, raw storage, screenshots, free text, device identifiers, geolocation, or raw wearable telemetry.

## Phased tasks

### Phase 0, contract inventory and guardrails

- [x] Maintain separate client and server in-process EventBus instances.
- [x] Add a strict canonical `CognitiveInteractionEvent` v1 and completed-session job contract.
- [x] Add a bounded transport-free `CognitiveSessionEventCollector`.
- [x] Keep a legacy bridge as a migration adapter, not the target contract.
- [x] Replace server-relevant `z.any()` legacy EventBus schemas with strict, minimal payloads or retire the events. `MISTAKE_MADE`, `HIT`, and `MISS` are now explicit compatibility-only UI-local schemas.
- [ ] Classify every EventBus event as `ui-local`, `server-domain`, or `durable-analytics` in code and tests.

**Acceptance gate:** no new analytics consumer may depend on unversioned or `z.any()` payloads; boundary tests prove client code does not import server infrastructure.

### Phase 1, collector adoption in engines

- [~] Add module metadata, lifecycle ownership, and collector integration to each supported cognitive engine. Schulte, N-Back, Stroop, Numerical, Logical, Typing, Spatial, Mental Math, Dispatcher, Collision, Topology, Noise Reduction, Language Scanner, Decryptor, Reality Check, Schulte 90, Stroop Alphabet, Alphabet Table, and Situational are adopters; remaining engines are pending.
- [~] Record `trial_started`, `trial_answered`, checkpoints, and exactly one terminal event where applicable. The adopted engines record start, answers where available, and completion; checkpoint adoption remains module-specific.
- [ ] Preserve legacy events only through the bridge while adopters migrate.
- [x] Reject oversized, unordered, duplicate-terminal, and sensitive event records before any transport.
- [~] Add deterministic synthetic fixtures for each module family. Schulte, N-Back, Stroop, Numerical, Logical, Typing, Spatial, Mental Math, Dispatcher, Collision, Topology, Noise Reduction, Language Scanner, Decryptor, Reality Check, Schulte 90, Stroop Alphabet, Alphabet Table, and Situational coverage is added; remaining module families are pending.

**Acceptance gate:** a completed supported training session produces a valid `CompletedSessionAnalyticsJob` with non-empty events. Abandoned sessions do not masquerade as completed jobs.

### Phase 2, durable Node-owned delivery

- [x] Insert opt-in `analytics_outbox` metadata in the authoritative Node/Prisma game-save transaction.
- [x] Implement idempotency, worker leases, bounded retry, dead-letter state, and aggregate-only outbox metrics.
- [ ] Implement the production dispatcher that leases an outbox row and retrieves a privacy-reviewed canonical job through Node.
- [ ] Persist or otherwise bind the canonical job to the source session under an explicit reviewed storage contract.
- [ ] Remove the current fallback subscriber path that analyzes `events: []` once collector delivery is available.

**Acceptance gate:** a game save and its outbox entry commit atomically; worker failure never rolls back a saved game; restart recovery processes eligible rows exactly once per successful lease.

### Phase 3, parity corpus and Rust shadow analysis

- [x] Maintain TypeScript/Rust `AnalyzeSession` contract fixtures and privacy validation.
- [x] Provide `kognitika-core` as a deterministic native and WASM computation boundary.
- [x] Provide an internal-only Axum sidecar with no database configuration.
- [ ] Add a Node adapter with request timeout, contract-version mapping, and aggregate-only error telemetry.
- [ ] Run TypeScript and Rust over the same synthetic corpus and compare normalized outputs with documented tolerances.
- [ ] Store only aggregate mismatch counts and safe error codes, not raw event payloads.

**Acceptance gate:** all required synthetic fixtures meet exact or documented-tolerance parity; invalid and sensitive inputs are rejected consistently; sidecar unavailability produces retryable shadow work only.

### Phase 4, canary and promotion

- [ ] Enable shadow dispatch for a controlled, non-authoritative percentage through a feature flag.
- [ ] Define operational thresholds for outbox lag, dead letters, timeout rate, and parity mismatch rate.
- [ ] Run a time-bounded canary with TypeScript output remaining authoritative.
- [ ] Promote Rust only for `AnalyzeSession` after the thresholds are met and rollback is rehearsed.

**Acceptance gate:** disabling the flag immediately stops sidecar dispatch without affecting game saves, login, API responses, or Socket.io. Node continues to validate and persist the selected summary.

### Phase 5, follow-on work, not part of the first promotion

- [ ] Evaluate browser WASM only behind the existing frame-budget benchmark and Worker boundary.
- [ ] Consider deterministic generators and longitudinal aggregation only after session-analysis promotion.
- [ ] Reassess a public Rust HTTP surface only after an implementation-neutral OpenAPI contract exists.

## Explicit non-goals

This roadmap does **not** authorize a Rust rewrite of React, Express, Prisma, PostgreSQL migrations, authentication, Brain ID, public HTTP routes, Socket.io duels, or production database ownership.

## Verification matrix

| Change type | Required verification |
|---|---|
| Core contract or collector | focused Vitest contract, collector, bridge, and boundary tests |
| Outbox/store | focused outbox, Prisma outbox, and game-save transaction tests |
| Rust core or sidecar | `cargo fmt --check`, `cargo clippy -D warnings`, Rust tests, and TypeScript/Rust parity suite |
| Dispatcher/canary | focused integration tests for timeout, retry, idempotency, version mapping, and flag rollback |
| Documentation-only update | `git diff --check` and relevant architecture/boundary tests |
