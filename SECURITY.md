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

## Dependency Risk Register

Reviewed exceptions must remain open in Dependabot until an upstream patch or
safe parent-level upgrade is available.

| Dependency | Advisory | Reachability | Current control | Removal condition |
|---|---|---|---|---|
| `image-size@1.2.1` | GHSA-5p2g-fcmc-qvqq, GHSA-w3rx-r6r6-pgpr | Transitive through React Native Metro build tooling; it is not used by the runtime server to process user-provided images. | Do not feed untrusted image buffers to Metro tooling. Keep Dependabot alerts #54 and #55 open. | Upgrade Metro/React Native when its dependency graph includes an upstream fixed `image-size` version. |
| `uuid@7.0.3` | GHSA-w5hq-g745-h8pq | Transitive through Expo 56 config plugins and `xcode@3.0.1`, used for mobile build/configuration tooling. | Do not force `uuid@11` through an override because it is a major compatibility change. Keep Dependabot alert #2 open. | Upgrade Expo/config plugins when the parent chain no longer resolves vulnerable UUID. |
