# Axum strangler contract

**Status:** proposed, requires infrastructure, privacy, and operations approval
before implementation or traffic routing.

**Tracking:** [#223](https://github.com/xodapi/kognitika/issues/223)

## Purpose and invariants

This contract permits a phased, reversible evaluation of Axum for one
non-identity, read-only endpoint. React remains the client, while Express,
Node, Prisma, and PostgreSQL remain the production authorities.

- No authentication, `/api/admin`, write endpoint, WebSocket route, or database
  credential may cross the pilot boundary.
- Axum must not receive `DATABASE_URL`, Prisma configuration, database
  credentials, JWT secrets, or application credentials.
- The existing internal analytics sidecar remains an analysis-only service. It
  does not become public ingress or a database client through this contract.
- The default routing configuration sends all traffic to Express. A kill switch
  must restore that state without a code deploy.
- Logs, metrics, traces, fixture data, and parity reports must be aggregate or
  synthetic only. They must never contain a Brain ID, token, raw IP address,
  request body, or private telemetry.

## API ownership matrix

| Express boundary | Current authority | Axum status | Auth/data boundary | Parity and rollback |
| --- | --- | --- | --- | --- |
| `GET /api/health` | Express in `server.ts` | **Pilot candidate only** | Public, read-only; process health and build ID only; no database access | Schema/status parity against Express; `AXUM_HEALTH_PILOT_ENABLED=false` routes all traffic to Express |
| `/api/auth/*`, `/api/me` | Express | Excluded | Identity, JWT, profile lookup | No Axum route |
| `/api/admin/*` | Express | Excluded | Authenticated admin, sensitive operational data | No Axum route |
| `/api/game/*`, `/api/progress` | Express | Excluded | Authenticated persistence, XP/idempotency | No Axum route |
| `/api/analytics/*`, `/api/dashboard/*`, `/api/daily-trajectory/*` | Express | Excluded | Profile-linked data, server reads/writes | No Axum route |
| `/api/leaderboard/*`, `/api/ideas/*`, `/api/feedback/*` | Express | Excluded | Product data and, for some routes, writes/auth | No Axum route |
| `/api/chat/*`, Socket.io | Express | Excluded | Streaming/realtime traffic | No Axum route |
| `/api/client-error`, `/api/analytics/practice-flow` | Express | Excluded | Observability/telemetry intake | No Axum route |
| `/api/neurotrainer/*`, `/api/investor-leads/*` | Express | Excluded | Authenticated generation or externally submitted content | No Axum route |
| `POST /internal/v1/analyze-session` | Internal analytics sidecar | Existing, internal-only | Node-mediated synthetic/shadow analysis; no persistence | Existing shadow controls, not public routing |

The sole pilot candidate is deliberately narrow: `GET /api/health`. It does not
identify a user, accept a request body, query Prisma, or make Axum authoritative
for product behavior. Its current Express response contract is:

```json
{
  "status": "ok",
  "timestamp": "<ISO-8601 timestamp>",
  "buildId": "<build identifier>"
}
```

The candidate Axum implementation must return this JSON shape, use the same
HTTP status semantics, and source the build ID from an explicitly injected
non-secret value. It must not call Node, Prisma, or PostgreSQL to construct the
response.

## Proposed routing and operational boundary

No production proxy change is authorized by this document. When a separately
reviewed pilot implementation exists, Nginx may route only `GET /api/health` to
an internal Axum listener when all conditions below are met:

1. The listener binds only to loopback or an isolated internal network. It has
   no public host port and is not an Internet-facing service.
2. `AXUM_HEALTH_PILOT_ENABLED` is explicitly `true`; absent, invalid, or
   `false` values route every request to Express.
3. Only `GET` and `HEAD` requests to the exact `/api/health` path are eligible.
   All other paths, methods, query variants, errors, and proxy failures go to
   Express, never to a broad Axum location rule.
4. The proxy uses a bounded connect timeout of 250 ms and response timeout of
   1 s. Axum independently limits request handling to 500 ms and permits no
   request body.
5. A local rate limit protects the pilot, while the existing Express rate
   limits remain unchanged for every non-pilot route.
6. Proxy and service access logs record only route, method, status class,
   latency bucket, build ID, and rollout state. Request bodies, authorization
   headers, query values, and client IP addresses are excluded.

The implementation must make `AXUM_HEALTH_PILOT_ENABLED=false` sufficient to
stop new Axum requests, reload the proxy safely, and retain a fully working
Express `/api/health` path. Stopping Axum must also safely fall back to Express.

## Health, readiness, and observability

The pilot must expose internal-only `GET /health/live` and `GET /health/ready`.
Readiness is false until the Axum process has loaded its non-secret build ID and
routing configuration. Neither endpoint may probe PostgreSQL or depend on an
authenticated Node service.

Approved aggregate metrics are request count, status class, timeout count,
fallback count, latency buckets, readiness state, and build ID. They must not
use identity, request, URL-query, payload, or raw network-address labels.

## Contract and parity tests

Before enabling a nonzero pilot percentage, CI must prove:

1. Express and Axum return the same status code and JSON schema for healthy,
   degraded, and malformed-method synthetic requests.
2. Timestamp assertions validate ISO-8601 format rather than exact wall-clock
   equality; build IDs are injected deterministically in test fixtures.
3. Axum rejects request bodies and unsupported methods without forwarding,
   logging, or storing them.
4. The process environment and container manifest contain none of
   `DATABASE_URL`, PostgreSQL credentials, Prisma migration configuration, JWT
   secrets, or application credentials.
5. With the kill switch off, with Axum unavailable, and after a proxy reload,
   `/api/health` is served by Express with its current contract.
6. No route outside the exact health path can be sent to Axum.

All fixtures must be synthetic and contain no user records, tokens, Brain IDs,
or private telemetry.

## Promotion gates

The pilot is disabled at deployment. A reviewer may enable a bounded
internal/non-production validation only after the contract tests pass and an
operations owner records the start and end time.

Production exposure requires all of the following:

- approval of this contract and the accompanying reverse-proxy change;
- the privacy default-deny work and its operational verification;
- dependencies required by [#168](https://github.com/xodapi/kognitika/issues/168);
- 100% synthetic/staging parity with zero schema or status mismatches;
- an observed fallback/kill-switch exercise;
- confirmed absence of Rust database and secret credentials; and
- an assigned rollback owner.

No promotion expands the pilot beyond the health endpoint. Adding an
identity-aware, write, administrative, database-backed, or public-traffic
authority endpoint requires a new design and approval.

## Explicit non-goals

This contract does not authorize a Node replacement, production cutover,
authentication migration, database writes, DDL, SQLx migrations, direct
PostgreSQL access, public Axum ingress, or changes to the existing analytics
sidecar authority.
