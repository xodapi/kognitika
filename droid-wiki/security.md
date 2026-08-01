# Security

## Security boundaries

Kognitika enforces several security contracts verified by automated tests. These cover authentication, authorization, data privacy, and network configuration.

| Boundary | Test file | What it enforces |
|---|---|---|
| Socket.io trust (duels) | `src/tests/socket-duels.test.ts` | Users must authenticate before joining duels. They cannot join or observe duels they are not authorized for. |
| Admin route authorization | `src/tests/admin-route-privacy.test.ts` | Admin-only API routes reject non-admin users. The `role` field from JWT is not trusted alone -- the server queries PostgreSQL for the actual role. |
| Analytics export privacy | `src/tests/analytics-export-privacy.test.ts` | The `/api/analytics/export` endpoint returns data with no raw Brain ID, email, token, or password hashes. |
| App identity privacy | `src/tests/app-identity-privacy.test.tsx` | The React UI does not display raw Brain IDs, email addresses, or tokens. |
| Legacy email audit | `src/tests/legacy-email-audit.test.ts` | Email and password fields on the User model are never exposed through public APIs. |
| CORS configuration | `src/tests/cors-config.test.ts` | Wildcard origins are rejected in production. The explicit allowlist is always applied. |
| Logging privacy | `src/tests/logging-privacy.test.ts` | Server logs do not contain raw Brain IDs, email addresses, tokens, or password hashes. |

## Authentication

Brain ID is the sole public authentication method. Users register with a phone number and receive a `brainId`. The server signs a JWT containing the user ID and identity type. All protected routes verify this JWT through the `authenticate` middleware at `src/server/middleware/auth.ts`.

Rate limiting applies to auth endpoints: 10 requests per hour per IP.

## CORS

CORS is configured through `src/server/config/cors.ts`. In production, the `CORS_ORIGIN` environment variable must contain an explicit comma-separated allowlist. Wildcard (`*`) CORS is rejected in production. The configuration also accepts Capacitor native app origins (`capacitor://localhost`, `https://localhost`) when `CORS_ALLOW_NATIVE_APP=true`.

The canonical production domain is `https://kognitika.ru`. The actual production allowlist is deployment configuration, not a fixed list in this generated reference. It must contain only approved explicit origins; legacy `*.syntog.ru` domains are not current canonical runtime URLs.

## Privacy guard middleware

The `privacyGuard` middleware at `src/server/middleware/privacy.ts` runs on every API response before the route handlers. It strips any accidentally included personally identifiable information from responses. This is an additional safety layer on top of the manual sanitization in each route.

## Admin access

Admin routes are protected by both JWT verification and a server-side database query for the user's role. The JWT alone is never trusted for admin authorization. If the database returns a role other than `ADMIN`, the request is rejected even if the JWT claims admin access.

## Data privacy

- No raw Brain IDs are exposed in API responses or UI components.
- Email and password fields on the User model are legacy-gated and never returned through public API endpoints.
- The analytics export endpoint at `/api/analytics/export` strips all personally identifiable information before returning data.
- Server-side logging uses the `safeError` utility at `src/lib/safe-logger.ts` to redact sensitive fields from error objects.

## Vulnerability reporting

This is a private project. Report vulnerabilities privately to the repository owner rather than opening a public issue. Include a description, steps to reproduce, affected components, and potential impact. Do not disclose the vulnerability publicly until it has been addressed.

See `SECURITY.md` in the project root for the full security policy. See `security_spec.md` for the feedback system data invariants and threat model.
