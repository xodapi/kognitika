# Stabilized MVP Platform Audit, August 2026

**Audit basis:** `origin/main` at `af58af6` before the isolated remediation below.
**Scope:** runtime truth, identity/privacy boundaries, public-route/trainer contracts, and local quality evidence. Rust analytics, Prisma/migrations, CI/deploy configuration, README/Wiki, and production infrastructure were intentionally excluded.

## Verified Current State

- `server.ts` is the full-stack Express runtime: default port `3006`, `/api/health`, API routers, Socket.io, Vite middleware in development, and static `dist` serving in production.
- The Docker image uses an unprivileged `kognitika` user and launches the installed `tsx` entrypoint rather than relying on a runtime Corepack cache.
- `package.json` pins pnpm `10.22.0` and carries scripts for source/test type-checking, focused V8 coverage, build, bundle budget, Playwright, and Knip.
- `.dockerignore` excludes `.env`, root and nested `node_modules`, `.pnpm-store`, build/test outputs, Rust targets, and local scratch artifacts.
- CORS is allowlist-based, rejects production wildcards, and fails closed for cross-origin browser requests when the production allowlist is empty. Native Capacitor origins are independently constrained.
- Admin authorization performs a database role lookup rather than trusting the role claim in a JWT.
- Public trainer routes, recommendation targets, route definitions, knowledge-base article URLs, and glossary tags have contract coverage. Representative generator tests demonstrate fixed-seed determinism, and the core EventBus validates registered payload schemas.

## Findings

### P1, remediated: Duel runtime bypassed the safe logging boundary

- **Evidence:** `src/server/realtime/duels.ts`, `registerDuelHandlers`, defaulted `logger` to `console` and interpolated internal user IDs, socket IDs, room IDs, and pseudonyms into logs.
- **Impact:** A reachable Socket.io duel session could place persistent/internal identifiers outside `createSafeLogger` redaction and environment controls. This conflicted with the logging privacy boundary enforced by `src/tests/logging-privacy.test.ts` for the rest of the runtime.
- **Reproduction:** Establish an authenticated duel socket, then matchmaking, room join, completion, or disconnect triggers the direct logger calls.
- **Smallest safe remediation:** Use `createSafeLogger('duels')`; retain only non-identifying debug messages and aggregate rating deltas. Update the injected test logger interface.
- **Write-set overlap:** None. This changes only realtime duel logging and its targeted test, not the excluded Rust, migration, CI/deploy, README/Wiki, or production files.
- **Status:** Implemented and targeted tests pass.

### P3, planned: `AUDIT_BRIEF.md` is historically stale

- **Evidence:** `docs/AUDIT_BRIEF.md` names `https://kognitika.syntog.ru`, reports a July 29 commit, and claims all Vitest checks are green. Current canonical domain is `https://kognitika.ru`; migration remediation is `af58af6`; local full-suite execution remains limited by Windows bind-mount performance.
- **Impact:** External reviewers could use stale runtime and validation claims.
- **Smallest safe remediation:** Update the brief in a documentation-owned change, preserving the distinction between Linux CI evidence and local timeouts.
- **Write-set overlap:** Yes, documentation is explicitly excluded from this audit agent's write set.

### P3, planned: Generated Wiki artifacts advertise planned OpenAPI endpoints as live

- **Evidence:** `droid-wiki-ru/features/api-reference.md` documents `/api/docs` and `/api/docs.json`, while `docs/SWAGGER_IMPLEMENTATION_PLAN.md` marks both routes as not implemented and `server.ts` does not mount them.
- **Impact:** Readers of generated Wiki material could expect unavailable endpoints.
- **Smallest safe remediation:** Correct the generated Wiki through its owning documentation workflow after OpenAPI ownership confirms the intended status.
- **Write-set overlap:** Yes, GitHub Wiki/generated documentation is excluded.

## Verification Evidence

Passed in isolated Linux containers using the pushed source:

- `src/tests/socket-duels.test.ts` and `src/tests/logging-privacy.test.ts`: 9/9 tests.
- `src/tests/analytics-export-privacy.test.ts`: passed.
- `src/tests/legacy-email-audit.test.ts`: passed.
- `src/tests/navigation-contract.test.ts`: passed.
- `src/tests/logging-privacy.test.ts`: passed.
- `src/tests/knowledge-base-contract.test.ts`: passed.
- `src/tests/runtime-platform.test.ts`: passed.

The combined targeted audit command exceeded the local timeout after the listed passes, due to the known Windows bind-mount module-loading cost. It is not reported as a complete-suite pass.

## Limitations and Non-Findings

- No production server, production database, production secrets, or production deployment were accessed.
- No live `/api/docs` claim was made; those endpoints are planned only.
- The audit did not change Rust analytics, cognitive event contracts, Prisma migrations, CI/deploy, README, Wiki, or `docs/beseda ai agent`.
- No real user data, raw Brain ID values, secrets, tokens, screenshots, or private telemetry were collected or added.
