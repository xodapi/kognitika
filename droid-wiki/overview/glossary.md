# Glossary

## EventBus

A singleton event emitter at `src/core/events/event-bus.ts` that decouples trainer engines from analytics subscribers and persistence. Events are typed through the `EventMap` interface and validated with Zod schemas before delivery. Middleware chains process events in order.

## Brain ID

The primary authentication system. Users register with a phone number and receive a `brainId` that identifies them without email or password. Brain ID tokens are signed with JWT and verified server-side. The platform does not expose raw Brain IDs in API responses or analytics exports.

## Seed

An integer parameter passed to all trainer generators to produce deterministic output. The same seed always produces the same grid, sequence, or problem set. This guarantees reproducible test results across runs.

## Event-Driven Architecture (EDA)

The software pattern where components communicate through events rather than direct method calls. In Kognitika, trainer engines emit events to the EventBus, and analytics subscribers, persistence layers, and UI widgets react to those events independently.

## Cognitive Module Graph

A visual representation of all trainer modules and their prerequisite relationships. Defined in `src/lib/knowledge-base.ts` and rendered with `@xyflow/react`. The graph shows which modules a user has completed and which ones are available to unlock next.

## WASM-ready boundary

A design contract that defines the interface between the analytics worker and the rest of the system in terms that a future Rust/WASM implementation could satisfy. The worker accepts `ClickEvent` objects (`{ cellId, reactionTimeMs }`) and returns metric shapes. A WASM module that matches this interface can replace the JS implementation without changing any other code.

## Privacy-safe analytics export

The analytics export endpoint at `/api/analytics/export` returns cognitive data in a format that strips all personally identifiable information, raw session IDs, and exact timestamps. The response includes a `privacy` object confirming `safe_for_external_llm: true`, which means the data can be fed into any LLM for personal analysis without identity risk.

## Analytics worker

A web worker at `src/workers/analytics.worker.ts` that computes cognitive metrics (reaction time distributions, accuracy, fatigue index, engagement index, suspicious pattern score) from raw click events. Runs off the UI thread to keep interactions smooth.
