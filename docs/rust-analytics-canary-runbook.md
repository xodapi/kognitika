# Rust analytics shadow canary runbook

**Status:** operational preparation only. This document does not authorize a production rollout by itself.

## Invariants

- Node, Prisma, and PostgreSQL remain authoritative for authentication, game save, XP, idempotency, and summary persistence.
- Rust is internal-only, has no database credentials, no host port, and no public ingress.
- TypeScript output remains authoritative throughout the canary.
- Rollback is configuration-only: set `RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT=0` and restart the app through the repository-first deploy flow.
- Do not transmit or inspect raw production jobs in logs, dashboards, shell history, or tickets.

## Preflight, before any canary

1. Merge the reviewed PR and deploy through the canonical repository-first process.
2. Confirm the internal `analytics-sidecar` container has no published host ports and no `DATABASE_URL`, PostgreSQL, JWT, or application secrets in its environment.
3. Keep all three runtime switches disabled initially:

   ```env
   ANALYTICS_OUTBOX_SHADOW_ENABLED=false
   ANALYTICS_OUTBOX_DISPATCH_ENABLED=false
   RUST_ANALYTICS_SIDECAR_ENABLED=false
   RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT=0
   ```

4. In a non-production internal environment, enable the worker and sidecar with rollout still at `0`, then verify the complete switch set before the synthetic HTTP parity check:

   ```bash
   ANALYTICS_OUTBOX_SHADOW_ENABLED=true \
   ANALYTICS_OUTBOX_DISPATCH_ENABLED=true \
   RUST_ANALYTICS_SIDECAR_ENABLED=true \
   RUST_ANALYTICS_SIDECAR_URL=http://analytics-sidecar:3010 \
   RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT=0 \
   pnpm check:rust-analytics-canary
   ```

   Then run the synthetic HTTP parity check:

   ```bash
   RUST_ANALYTICS_SIDECAR_URL=http://analytics-sidecar:3010 \
   RUST_ANALYTICS_SIDECAR_PARITY_RUN=true \
   pnpm check:rust-analytics-parity
   ```

   The command must report zero mismatches and zero safe errors. It sends deterministic synthetic fixtures only.

5. Confirm normal game save, XP, login, API, and Socket.io smoke checks work with rollout at `0`.

## Time-bounded 1% canary

After preflight is recorded, set only these switches in the application environment:

```env
ANALYTICS_OUTBOX_SHADOW_ENABLED=true
ANALYTICS_OUTBOX_DISPATCH_ENABLED=true
RUST_ANALYTICS_SIDECAR_ENABLED=true
RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT=1
```

- The selection is deterministic by durable server session ID.
- The canary must have a defined start and end time and an assigned deploy owner.
- Do not increase the percentage during the first window.
- Keep TypeScript summary persistence enabled and authoritative.

## Promotion gates

Do not consider a larger shadow percentage until all of the following are true for the bounded window:

| Metric | Gate |
|---|---:|
| Shadow requests | at least 100 |
| Parity mismatch rate | at most 1% |
| Rust timeout rate | at most 2% |
| Oldest eligible outbox lag | at most 60 seconds |
| Outbox dead letters | 0 |
| Game save / XP / auth regressions | 0 |

Metrics must remain aggregate-only. Safe error codes are acceptable operational data; raw session payloads are not.

## Rollback

Immediately set:

```env
RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT=0
```

Then restart the Node application through the canonical deploy flow. This stops new Rust calls without affecting saved games, retries, login, public APIs, or Socket.io. Leave the sidecar internal-only and inspect aggregate error/lag/dead-letter counters. Do not retry a failed canary by changing code directly in production.

## Explicit non-goals

This runbook does not authorize Rust promotion, a public sidecar endpoint, Rust database access, a production migration, or direct production shell edits.
