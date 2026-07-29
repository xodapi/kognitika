# Security Policy

## Supported Versions

Only the latest commit on the `main` branch is supported. There are no LTS releases.

## Reporting a Vulnerability

This is a private project. If you discover a security vulnerability, please report it privately by contacting the repository owner directly rather than opening a public issue.

**Do not** disclose the vulnerability publicly until it has been addressed.

When reporting, include:
- A description of the vulnerability
- Steps to reproduce (PoC preferred)
- Affected components (API, auth, storage, etc.)
- Potential impact

## Security Boundaries

Key security contracts enforced by tests:

| Boundary | Test file |
|---|---|
| Socket.io trust (duels) | `src/tests/socket-duels.test.ts` |
| Admin route authorization | `src/tests/admin-route-privacy.test.ts` |
| Analytics export privacy | `src/tests/analytics-export-privacy.test.ts` |
| App identity privacy | `src/tests/app-identity-privacy.test.ts` |
| Legacy email audit | `src/tests/legacy-email-audit.test.ts` |
| CORS configuration | `src/tests/cors-config.test.ts` |

See also: `security_spec.md` — Feedback system data invariants and threat model.

## Runtime Security Notes

- Brain ID is the sole public auth method; email/password are legacy-gated
- CORS uses an explicit allowlist (`CORS_ORIGIN`); wildcard requires `CORS_ALLOW_DEV_WILDCARD=true`
- JWT tokens are server-verified; ADMIN role is not trusted from JWT alone
- Firebase has been removed from the runtime architecture
