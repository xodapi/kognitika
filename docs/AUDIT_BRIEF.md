# Kognitika, auditor-facing project brief

> **Status:** Stabilized MVP. This brief describes the current tracked repository state and does not substitute for a deployment or production review.

## 1. Product and runtime

Kognitika is a private cognitive-training web platform with trainer modules, gamification, real-time duels, and progress analytics.

- Repository: `github.com/xodapi/kognitika` (private, primary branch `main`)
- Canonical production domain: `https://kognitika.ru`
- Health check: `https://kognitika.ru/api/health` (returns a `buildId`)
- Runtime: one full-stack Express/Socket.io process in `server.ts`, default port `3006`; it serves API routes and the Vite production build.

## 2. Technology boundaries

| Layer | Current authority |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind, Motion, Recharts |
| Backend | Express, Socket.io, Prisma, PostgreSQL |
| Mobile | Capacitor |
| Analytics runtime | Current JS/TypeScript workers and server services |
| Rust research/core | `crates/kognitika-core` implements `AnalyzeSession`, but is not the production analytics runtime authority |

Browser WASM work remains gated by the frame-budget acceptance criteria in `docs/frame-budget-benchmark.md`.

## 3. Identity and privacy boundaries

- Public authentication is Brain ID-first. Legacy email/password flows are not public runtime identity surfaces.
- Raw Brain ID, email, password-like fields, and tokens must not be exposed in public UI/API contracts.
- CORS uses `CORS_ORIGIN` allowlisting. Production wildcard CORS is rejected; an empty production allowlist fails closed for cross-origin browser requests.
- JWT protects authenticated routes. Admin authorization performs a server-side role lookup rather than trusting a JWT role claim.
- Logging and analytics-export privacy have dedicated contract tests.

## 4. Database migration state

The initial Prisma baseline and fail-closed preflight remediation are available on `main` starting with commit `af58af6`.

- Fresh PostgreSQL databases use the normal committed migration chain.
- Existing schemas require reviewed migration-history adoption before deployment can continue.
- See `docs/database-migration-baseline.md` for the operator runbook.

## 5. Quality evidence

The repository provides type-check, targeted coverage, Vitest, Playwright, bundle-budget, Rust, Docker, and Knip checks. Targeted privacy, route, navigation, and knowledge-base contracts provide specific evidence for their boundaries.

Do not interpret a local Windows bind-mount timeout as a passing full Vitest suite. Full-suite success requires current Linux CI or another completed compatible execution. Local verification should report completed checks and environment limits separately.

## 6. Known review limits

- PWA/offline-first remains disabled until `docs/pwa-offline-strategy.md` acceptance gates are met.
- OpenAPI/Swagger work is planned in GitHub issue #138. `/api/docs` and `/api/docs.json` are not live endpoints.
- Deployment follows the repository-first flow in `AGENTS.md`; direct production edits are prohibited outside its documented emergency procedure.

## 7. Key references

- `AGENTS.md`, repository and deployment rules
- `ARCHITECTURE.md` and `KOGNITIKA_CORE.md`, architecture context
- `SECURITY.md`, security policy
- `docs/brain-id-identity.md`, identity boundaries
- `docs/database-migration-baseline.md`, migration baseline runbook
- `docs/frame-budget-benchmark.md`, browser WASM performance gate
