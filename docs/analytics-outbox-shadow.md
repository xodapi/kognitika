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

## Validation

- `src/tests/analytics-outbox.test.ts` covers the portable lifecycle contract.
- `src/tests/prisma-analytics-outbox.test.ts` covers Prisma claim ownership, lease-safe transitions, recovery, and aggregate-only metrics.
- `src/tests/prisma-analytics-outbox-postgresql.test.ts` exercises PostgreSQL locking and lease recovery against the disposable migrated CI database.
- `src/tests/game-save.test.ts` proves opt-in outbox insertion occurs in the same transaction as the authoritative game save and does not receive input metadata.

No production database operation is performed outside the protected Prisma migration workflow.
