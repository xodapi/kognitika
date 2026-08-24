# Kognitika HTTP API reference

This is the human-readable contract for the currently mounted Express API.
It is not an OpenAPI document; implementation-independent OpenAPI remains
tracked separately in issue #138.

## Common rules

- Base URL: `https://kognitika.ru` in production, or the local `APP_URL`.
- JSON requests use `Content-Type: application/json`.
- Authenticated endpoints use `Authorization: Bearer <token>`.
- Validation failures return `400` with `{ "error": "..." }`.
- Missing or invalid authentication returns `401`.
- Permission failures return `403`.
- Unexpected persistence failures return a sanitized `500`; database details
  are not returned to clients.
- Responses must not contain raw Brain ID, email, JWT, password, or private
  telemetry fields.

## Health and public endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Service status and short build ID. |
| `POST` | `/api/auth/brain` | No | Create or restore an anonymous Brain ID session. |
| `POST` | `/api/auth/restore` | No | Restore an existing session using the supported resume contract. |
| `GET` | `/api/me` | Yes | Read the authenticated user's safe public profile fields. |
| `GET` | `/api/progress` | Yes | Compatibility redirect to `/api/game/progress`. |
| `GET` | `/api/leaderboard` | No | Read the public leaderboard with validated query parameters. |
| `GET` | `/api/game/leaderboard` | No | Read the game leaderboard. |
| `GET` | `/api/analytics/compare` | No | Read the privacy-safe comparison response. |
| `POST` | `/api/investor-leads` | No | Submit a request-only investor contact form. |

## Training and progress

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/game/attempts` | Yes | Issue one server-bound game attempt. |
| `POST` | `/api/game/save` | Yes | Save a completed session with idempotent attempt credentials. |
| `GET` | `/api/game/progress` | Yes | Read the current user's progress. |
| `POST` | `/api/game/session/:id/metadata` | Yes | Attach validated session metadata. |
| `GET` | `/api/dashboard/status` | Yes | Read dashboard status. |
| `GET` | `/api/daily-trajectory` | Yes | Read the user's daily plan. |
| `POST` | `/api/daily-trajectory/generate` | Yes | Generate a validated daily plan. |
| `PATCH` | `/api/daily-trajectory/item` | Yes | Update a plan item. |
| `POST` | `/api/feedback` | Yes | Submit product feedback. |
| `GET` | `/api/analytics/profile` | Yes | Read the user's privacy-safe analytics profile. |
| `GET` | `/api/analytics/export` | Yes | Export the user's allowed analytics data. |
| `GET` | `/api/analytics/summaries` | Yes | Read validated session summaries. |
| `GET` | `/api/analytics/summaries/trend` | Yes | Read summary trend data. |
| `GET` | `/api/analytics/cognitive-trend` | Yes | Read cognitive trend data. |
| `GET` | `/api/analytics/longitudinal` | Yes | Read longitudinal analytics. |
| `GET` | `/api/analytics/longitudinal/strata` | Yes | Read privacy-safe longitudinal strata. |

## Ideas, chat, and practice flow

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/ideas` | No | Read public idea summaries. |
| `POST` | `/api/ideas` | Yes | Submit an idea. |
| `POST` | `/api/ideas/:id/vote` | Yes | Vote on an idea. |
| `GET` | `/api/chat/stream` | No | Open the bounded chat SSE stream. |
| `POST` | `/api/chat/messages` | No | Submit a validated chat message. |
| `POST` | `/api/analytics/practice-flow` | No | Record privacy-safe practice-flow telemetry only when explicitly enabled. |
| `POST` | `/api/client-error` | No | Submit a sanitized client error report. |
| `POST` | `/api/neurotrainer/analyze` | Yes | Analyze a validated training payload. |
| `POST` | `/api/neurotrainer/mental-math/generate` | Yes | Generate mental-math questions. |

## Admin boundary

Admin endpoints are mounted below `/api/admin` and require both bearer
authentication and the server-side admin check. They are intentionally not
part of the public product contract:

- `GET /api/admin/users`
- `GET /api/admin/stats`
- `GET /api/admin/practice-flow`
- `GET /api/admin/analytics-outbox`
- `GET /api/admin/feedback`
- `POST /api/admin/feedback/:id/respond`
- `POST /api/admin/feedback/:id/response`
- `POST /api/admin/ideas/:id/status`

## Save contract and retry behavior

Clients should obtain credentials from `/api/game/attempts`, then send the
same `clientRunId`, `gameType`, `attemptId`, and `challenge` to
`/api/game/save`. A transient or unexpected `500` may be retried once with
the identical credentials. Clients must not loop indefinitely. A replay of
the same successful attempt is idempotent.
