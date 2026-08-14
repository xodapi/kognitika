# Durable analytics outbox, Node/Prisma ownership

## Scope

`analytics_outbox` records a completed game session that is eligible for future Rust shadow analysis. It is created **inside the existing Node/Prisma game-save transaction** only when `ANALYTICS_OUTBOX_SHADOW_ENABLED=true`.

The row deliberately contains only operational metadata:

- source session ID;
- analyzer and contract versions;
- deterministic idempotency key;
- lifecycle state, retry count, and lease metadata;
- aggregate operational error codes.

It contains no Brain ID, JWT, email, game metadata, raw event stream, raw telemetry, storage dump, or secret.

## Authority and rollout

- Prisma remains the sole production DDL authority.
- Node/Prisma is the only writer of `analytics_outbox`.
- Rust cores and the internal Axum sidecar do not receive `DATABASE_URL` or database credentials, and do not write this table.
- A future shadow caller must obtain a privacy-reviewed job through a Node-mediated boundary. This change does not deploy or wire such a caller.
- Rollback is disable-only: set `ANALYTICS_OUTBOX_SHADOW_ENABLED=false`. Existing rows remain available for controlled recovery; no game save waits for an analyzer.

## Lifecycle

```text
pending|retry -> processing (leased) -> completed
                              |
                              +-> retry -> dead (bounded failures)
processing lease expiry -> retry or dead (bounded retry budget)
```

Claims use a single PostgreSQL `FOR UPDATE SKIP LOCKED` statement, so competing Node workers lease distinct oldest available rows without blocking one another. Completion, failure, and recovery require an active unexpired lease. Metrics are aggregate-only: state counts, oldest pending/retry lag, and dead-letter failures.

## Operational snapshot

The protected `GET /api/admin/analytics-outbox` endpoint exposes one
aggregate-only in-process snapshot for operations. It contains state counts,
worker counters (including completed-row cleanup count), sidecar counters,
canary eligibility, and derived freshness. It never exposes session IDs, job
IDs, Brain IDs, payloads, identities, tokens, or raw telemetry.
The worker metrics query reads only lifecycle state and occurrence time, the
two fields required for aggregate state counts and lag. Counts and lag are
read inside one PostgreSQL repeatable-read transaction, so a concurrent
dispatch or completed-row purge cannot create a mixed-time snapshot.
Sidecar metrics are a fixed-shape set of seven aggregate counters. Every
counter saturates at `Number.MAX_SAFE_INTEGER`; no IDs, labels, or
high-cardinality dimensions are admitted.

The snapshot is intentionally not durable and has no historical retention
store:

- `fresh` means the last worker sample is at most 30 seconds old;
- `stale` means it is older than 30 seconds but still retained for up to five
  minutes;
- after five minutes, an absent or expired snapshot returns
  `{ "status": "unavailable" }`.

Treat `stale` and `unavailable` as a monitoring gap, not as evidence that the
outbox is healthy or eligible for canary promotion. The snapshot is cleared
when the process restarts and is never a source of rollout authority.

When explicitly enabled, completed-row retention runs as part of the same
worker cycle. It deletes only rows with `state=completed` and
`completedAt` before the configured cutoff. Pending, retry, processing, and
dead-letter rows are never removed. Retention failures are fail-open and do
not block dispatch.

Metrics collection is also fail-open and bounded: the worker abandons an
in-process observation after one second, while the underlying Prisma
repeatable-read transaction has a 500 ms acquisition budget and one-second
execution limit. A missing snapshot is an observability gap, never a reason
to delay or fail canonical dispatch.

Completed-row cleanup is disabled when its opt-in retention value is not a
positive integer from 1 to 365 days. Snapshot timeout configuration accepts
only integer values from 100 to 5000 milliseconds; invalid values use the
safe one-second default.

Outbox worker failure logs use fixed operational messages only. They do not
attach raw upstream errors, preventing session or payload fragments from being
introduced through exception text.

Worker shutdown is graceful and idempotent: `stop()` clears the interval and
waits for the active dispatch/retention/metrics cycle before resolving.
Repeated `start()` or `stop()` calls do not create duplicate timers or throw.
Server close, `SIGTERM`, and `SIGINT` share one shutdown path that stops the
worker, closes Socket.io/HTTP intake, and disconnects Prisma without logging
raw errors.

## Validation

- `src/tests/analytics-outbox.test.ts` covers the portable lifecycle contract.
- `src/tests/prisma-analytics-outbox.test.ts` covers Prisma claim ownership, lease-safe transitions, recovery, and aggregate-only metrics.
- `src/tests/prisma-analytics-outbox-postgresql.test.ts` exercises PostgreSQL locking and lease recovery against the disposable migrated CI database.
- `src/tests/game-save.test.ts` proves opt-in outbox insertion occurs in the same transaction as the authoritative game save and does not receive input metadata.

No production database operation is performed outside the protected Prisma migration workflow.
