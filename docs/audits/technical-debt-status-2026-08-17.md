# Technical Debt Status, 2026-08-17

**Branch:** main  
**Head:** 64c92c6 (Merge PR #274 refactor/game-save-srp)  
**Audit basis:** audit documents in `docs/audits/`, recent PRs #270–274, open GitHub issues.

---

## Closed Since Stabilized MVP Audit

| PR | What closed |
|---|---|
| #270 | Patched NanoID CVEs (nanoid < 5.0.10 and < 3.3.11) |
| #271 | Patched Vite (< 6.3.4) and Valibot (< 1.1.0) |
| #272 | Added test guards for all patched dependency resolutions |
| #273 | Documented dependency security exceptions in `docs/dependency-risk-register.md` |
| #274 | Extracted `analytics-job-writer.ts` from monolithic game-save service (SRP) |

P3 audit item — AUDIT_BRIEF.md domain staleness — is **already resolved**; the file correctly references `https://kognitika.ru` and `af58af6` is the documented Prisma baseline commit, not a claim about head.

---

## Open Items

### P1 — High priority stabilization

| Issue | Title | Status |
|---|---|---|
| #247 | Roll mobile contract to remaining 11 trainers | ✅ **COMPLETE** — all 13 rollout trainers have required data-testid hooks (see `docs/mobile-rollout-audit-2026-08-17.md`) |
| #226 | Design local-only mode and encrypted IndexedDB vault | status:planned |
| #223 | Define strangler contract for phased Axum API migration | status:planned |

### P2 — Medium priority hygiene

| Issue | Title | Status |
|---|---|---|
| #224 | Publish verified data-processing inventory, retention policy, local-first roadmap | status:planned |
| #248 | Fix mobile testing guide and publish as trainer standard | status:planned |

### P3 — Documentation / future-gated

- Wiki artifacts advertise `/api/docs` and `/api/docs.json` as planned endpoints. These are not live. Correct through the owning wiki workflow when OpenAPI is promoted.
- `game:completed` subscriber still creates summary jobs with `events: []`. Requires collector-backed delivery before analytics outputs can claim event-level behavior analysis. Tracked in ARCHITECTURE.md durable analytics boundary.

---

## Knip report

Knip configuration exists at `knip.config.js` with workspace rules for root, `apps/capacitor`, and `apps/mobile`. Knip was run directly with Node.js on Windows because the pnpm shim could not resolve `node` in the agent shell:

```text
node node_modules/knip/dist/index.js --production --strict
node node_modules/knip/dist/index.js
```

Both audits exited with code 0 and produced no findings. No unused production or development dependencies were identified.

---

## Verification baseline at 64c92c6

| Check | Result |
|---|---|
| Privacy / knowledge-base contracts (15) | Passed |
| Analytics registry, collector, game-save contracts (73) | Passed |
| Analytics outbox, shutdown, admin, sidecar, canary (41) | Passed |
| Dependency security regression guards (added in #272) | Passed |
| TypeScript typecheck | Passed |
| Prisma generate | Passed |
| Production Vite build | Passed |
| Full local Vitest suite | 663 tests passed (Windows bind-mount; confirm in Linux CI) |

---

## Next recommended actions

1. **#226 local-only mode** — privacy/identity P1; requires product and security gate before implementation.
2. **#223 Axum strangler contract** — deferred until Rust runtime authority decision is made.
3. **#248 mobile testing guide** — ✅ complete; the 13-trainer standard is documented in `docs/mobile-testing-guide.md`.
4. **#220 and #158** — production-only acceptance remains blocked on protected access, backup evidence, and reviewer approval; do not execute locally.
