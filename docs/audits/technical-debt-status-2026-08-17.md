# Technical Debt Status, 2026-08-18

**Branch:** main  
**Head:** `553013f` (`feat: add local Health Connect summary adapter`)
**Audit basis:** audit documents in `docs/audits/`, current source contracts, recent CI runs, and open GitHub issues.

---

## Closed Since Stabilized MVP Audit

| PR | What closed |
|---|---|
| #270 | Patched NanoID CVEs (nanoid < 5.0.10 and < 3.3.11) |
| #271 | Patched Vite (< 6.3.4) and Valibot (< 1.1.0) |
| #272 | Added test guards for all patched dependency resolutions |
| #273 | Documented dependency security exceptions in `docs/dependency-risk-register.md` |
| #274 | Extracted `analytics-job-writer.ts` from monolithic game-save service (SRP) |
| `ac16264` | Enforced the 1 MB canonical analytics-job limit at the parser boundary |
| `bae6abe` | Prevented outbox rows without canonical analytics jobs |
| `edaf3b3` | Patched transitive `deepmerge-ts` to 8.0.0; Dependabot alert fixed |
| `d11419b` | Added physiological session summary contract |
| `a0b0eea` | Added opt-in, shadow-only wearable recommendation policy |
| `553013f` | Added dependency-injected local-only Health Connect summary adapter |

P3 audit item — AUDIT_BRIEF.md domain staleness — is **already resolved**; the file correctly references `https://kognitika.ru` and `af58af6` is the documented Prisma baseline commit, not a claim about head.

---

## Open Items

### P0/P1 — Protected or high-priority work

| Issue | Title | Status |
|---|---|---|
| #220 | Protected, schema-guarded ADMIN recovery | ⚠️ **PRODUCTION-GATED** — repository workflow exists; protected production review and recovery evidence remain required |
| #158 | Reconcile production Prisma migration baseline | ⚠️ **PRODUCTION-GATED** — requires backup, read-only production inspection, reviewed reconciliation, and smoke checks |
| #247 | Roll mobile contract to remaining 11 trainers | ✅ **COMPLETE** — all 13 rollout trainers have required data-testid hooks (see `docs/mobile-rollout-audit-2026-08-17.md`) |
| #226 | Design local-only mode and encrypted IndexedDB identity vault | ✅ **DESIGN PROPOSED** — `docs/local-only-encrypted-vault-design.md`; product/security approval remains |
| #223 | Define strangler contract for phased Axum API migration | ✅ **CONTRACT PROPOSED** — `docs/axum-strangler-contract.md`; infrastructure/operations approval remains |
| #149 | Versioned physiological session summary contract | ✅ **CONTRACT IMPLEMENTED** — `contracts/physiological-session-summary-v1.json` and Zod contract; no connector or persistence |
| #151 | Shadow policy for wearable-informed recommendations | ✅ **SHADOW CONTRACT IMPLEMENTED** — default-off, cognitive-first, no user-visible rollout |

### P2 — Medium priority hygiene

| Issue | Title | Status |
|---|---|---|
| #224 | Publish verified data-processing inventory, retention policy, local-first roadmap | ✅ **INVENTORY IMPLEMENTED** — legal/owner assignment and protected infrastructure evidence remain |
| #248 | Fix mobile testing guide and publish as trainer standard | ✅ **COMPLETE** — the 13-trainer standard is documented in `docs/mobile-testing-guide.md` |
| #150 | Health Connect adapter with local-only summaries | ✅ **LOCAL ADAPTER IMPLEMENTED** — dependency-injected aggregate mapping; no SDK or permissions integration |

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

## Dependabot status

- `esbuild` is resolved to `0.28.1`; alert #4 is fixed. The historical `0.28.0`
  state existed after the Vite/Valibot patch and before the later esbuild
  override/guard.
- `deepmerge-ts` is resolved to `8.0.0`; alert #58 is fixed.
- `image-size@1.2.1` alerts #54/#55 and `uuid@7.0.3` alert #2 remain accepted
  transitive mobile-tooling exceptions documented in `SECURITY.md`. Do not
  force incompatible major overrides without an upstream parent upgrade.

---

## Latest verification baseline

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
| Wearable/Health Connect contract suites | 37 focused tests passed |
| Source TypeScript check | Passed |
| `a0b0eea` CI, Android, protected deployment | Passed |
| `d11419b` CI and protected deployment | Passed |
| `553013f` Secret Scan | Passed; CI/deployment pending at audit time |

---

## Next recommended actions

1. **#220 and #158** — protected production acceptance remains blocked on reviewer access, backup evidence, and read-only production verification; do not execute locally.
2. **#144** — ✅ **PARTIALLY IMPLEMENTED** — versioned 7/30/90-day,
   module-scoped, aggregate-only read projection and authenticated API now
   exist. The repository also has strict version/difficulty eligibility and
   identity-free quality policy/projection contracts with exclusion counters,
   plus a robust personal baseline/change contract for separately supplied
   metrics. The quality resolver has a shared Rust/TS fixture parity contract,
   and recompute has an append-only backfill contract. Integrated
   normalization, strata read model, threshold governance, actual backfill
   implementation, and wider Rust parity remain.
3. **#140/#146/#147** — canonical event lifecycle is partially implemented:
   versioned contract, local collector lifecycle, and additive Schulte /
   Numerical / N-back / Logical / Stroop / Schulte-90 / Mental Math /
   Alphabet Table legacy bridges now exist. Logical's legacy stream has no
   wrong-answer event, while the extended modules preserve only strict
   allowlisted completion shapes. Full module coverage, reviewed lifecycle
   sink, and runtime wiring remain.
4. **#149/#150/#151** — contracts are repository-implemented; update GitHub
   issue labels/status after owner review rather than claiming production
   wearable rollout.
