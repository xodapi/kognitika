# System architecture

Kognitika uses an event-driven architecture (EDA) with a clear separation between UI components, engine hooks, and analytics processing. This document covers the major architectural patterns.

## Event-driven architecture with EventBus

The `EventBus` class at `src/core/events/event-bus.ts` is the central communication channel. It decouples trainer engines from UI components, analytics subscribers, and persistence layers. Engines emit events through the bus, and subscribers react to them without direct dependencies.

Key events defined in `EventBus.EVENTS`:

| Event | Emitter | Subscribers |
|---|---|---|
| `CELL_CLICK` | Engine | Analytics, Recorder |
| `TRAINING_COMPLETE` | Engine | DB-writer, Leaderboard |
| `MISTAKE_MADE` | Engine | Analytics |
| `STABILITY_UPDATE` | Analytics | UI (HUD widgets) |
| `DIFFICULTY_SUGGESTION` | Analytics worker | Engine (adaptive mode) |

The EventBus supports middleware chains and Zod schema validation for every event type. Validation errors are caught by a configurable handler instead of crashing the bus.

## use{Module}Engine pattern

Every trainer module follows the same hook pattern:

```
UI Component <--> use{Module}Engine <--> EventBus <--> Analytics / Subscribers
```

Each `use{Module}Engine` hook (for example, `useSchulteEngine`, `useNBackEngine`, `useTypingEngine`) owns the game state, exposes actions (click, restart, submit), and emits events to the EventBus. UI components render from the hook's state and call its actions. They never contain game logic directly.

This pattern gives:

- Testability: engines can be tested without DOM rendering.
- Consistency: every trainer shares the same interface for state, actions, and event emission.
- Analytics decoupling: analytics subscribers receive events through the bus without engine imports.

## Seeded determinism

All generators (Schulte grids, N-Back sequences, spatial layouts, mental-math problems) accept a `seed` parameter. The same seed always produces the same output, which makes tests reproducible:

```typescript
const grid1 = generateGrid(5, 'classic', 42);
const grid2 = generateGrid(5, 'classic', 42);
expect(grid1).toEqual(grid2); // always true
```

This is verified by `src/tests/reproducibility.test.ts`.

## Analytics worker boundary

Analytics processing runs in a dedicated JS worker at `src/workers/analytics.worker.ts`. The worker receives `ClickEvent` objects (`{ cellId, reactionTimeMs }`) and computes metrics without blocking the UI thread. The contract is WASM-ready: a future Rust module could replace the JS implementation by matching the same event interface and returning the same metric shapes.

The analytics pipeline:

1. Engine emits `CELL_CLICK` and `TRAINING_COMPLETE` events.
2. Subscriber collects events into a session batch.
3. Batch is sent to the analytics worker (`src/workers/analytics.worker.ts`).
4. Worker computes metrics (reaction time distributions, accuracy, fatigue index, engagement index, suspicious pattern score).
5. Results are persisted via `SessionAnalyticsSummary` model and emitted back as `STABILITY_UPDATE` and `DIFFICULTY_SUGGESTION` events.
6. UI widgets (concentration curve, stability HUD) react to these events.

## Express + Socket.io server

The server at `server.ts` starts an Express app with a Socket.io server attached to the same HTTP server. It serves:

- API routes under `/api/*` (auth, game, analytics, admin, feedback, ideas, leaderboard, neurotrainer, daily-trajectory, practice-flow, observability).
- Static files from the Vite build in production.
- Vite dev middleware in development mode.

Rate limiting applies to all API routes (100 requests per 15 minutes) with a stricter limit for auth endpoints (10 per hour).

The Socket.io server handles real-time duel sessions through `src/server/realtime/duels.ts`. CORS configuration is shared between Express and Socket.io via `src/server/config/cors.ts`, which enforces an explicit allowlist in production.

## EDA flow diagram

```
  ┌──────────────┐    action     ┌──────────────────┐
  │   UI Widget  │◄──────────────│  use{Module}Engine│
  │  (React)     │    state      │                  │
  └──────┬───────┘               └────────┬─────────┘
         │                                │ emit events
         │                                ▼
         │                       ┌──────────────────┐
         │                       │    EventBus       │
         │                       │  (type-safe,      │
         │                       │   validated)      │
         │                       └────┬──────┬───────┘
         │                            │      │
         │              ┌─────────────┘      └─────────────┐
         │              ▼                                 ▼
         │   ┌──────────────────┐              ┌──────────────────┐
         │   │  Analytics       │              │  DB / Leaderboard │
         │   │  Subscriber      │              │  Subscriber       │
         │   └────────┬─────────┘              └──────────────────┘
         │            │
         │            ▼
         │   ┌──────────────────┐
         │   │ Analytics Worker │
         │   │ (JS / WASM-ready)│
         │   └────────┬─────────┘
         │            │ metrics
         │            ▼
         │   ┌──────────────────┐
         └──►│ STABILITY_UPDATE │
             │ DIFFICULTY_SUG.  │
             └──────────────────┘
```

The diagram shows the full flow: a user interacts with a UI widget, which calls an action on the engine hook. The engine updates its internal state (returned to the UI for rendering) and emits structured events to the EventBus. Subscribers pick up those events -- one subscriber forwards them to the analytics worker, another persists completed sessions to the database. The analytics worker returns computed metrics, which are emitted back through the bus to the UI.
