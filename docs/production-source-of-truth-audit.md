# Production Deployment Source of Truth and Technical-Data Boundary

**Issue:** [#221](https://github.com/xodapi/kognitika/issues/221)
**Audit date:** 2026-08-09
**Repository basis:** `origin/main` at `49168ca`
**Status:** verified technical audit. Not legal advice and not a declaration of regulatory compliance.

This document records the deployment authority and technical-data boundary for every
public Kognitika hostname. It complements
[`privacy-data-processing-inventory.md`](privacy-data-processing-inventory.md),
which defers several boundaries to this audit.

No production mutation was performed. No rows, credentials, secrets, tokens, IP
addresses, or raw telemetry were extracted or recorded. Public HTTP response
headers and DNS resolvability were inspected read-only.

## 1. Deployed build reconciliation

| Check | Result |
| --- | --- |
| `https://kognitika.ru/api/health` `buildId` | `49168ca` |
| `X-Build-Id` response header | `49168ca` |
| Is that a reviewed commit? | Yes, merge commit of PR #236 |
| Is it an ancestor of `origin/main`? | Yes, and it is `origin/main` HEAD |

**The drift described in #221 is resolved.** The issue reported build `02f5d76` as
older than reviewed work. Production now serves `49168ca`, which is the current
`origin/main` HEAD. No rollback or upgrade plan is required for build identity.

The build identity mechanism is trustworthy for this purpose: `deploy.yml`
compares the server checkout against `github.sha` and aborts on mismatch, then
asserts the health payload contains the expected `buildId` before the deploy is
allowed to succeed.

## 2. Deployment authority per hostname

| Hostname | Serving path | Trigger | Environment | Reachable |
| --- | --- | --- | --- | --- |
| `kognitika.ru` | Express on `127.0.0.1:3006`, checkout `/opt/kognitika`, unit `kognitika` | push to `main`, `deploy.yml` | `production` | yes |
| `kognitika.syntog.ru` | nginx 301 to `https://kognitika.ru/` | not managed by any workflow | none | yes, redirect only |
| `p.kognitika.ru` | static `/var/www/p-kognitika/current`, nginx | push to `main` on matching paths, `deploy-investor.yml` | `production` | yes |
| `www.kognitika.ru` | not configured | none | none | **no, TLS failure** |
| `m.kognitika.ru` | not configured | none | none | **no, does not resolve** |
| `m.kognitika.syntog.ru` | static `/var/www/m-kognitika`, nginx | `deployment/deploy-m-kognitika.sh`, manual | none | **no, certificate mismatch** |
| `admin.kognitika.syntog.ru` | not configured | none | none | **no, does not resolve** |

Checkout path, systemd unit, and `/opt/kognitika-dist-backups` are declared in
`deploy.yml` and were **not** verified on the host, which requires production
shell access outside this audit's scope.

## 3. Findings

### P0-1: `main` is unprotected while pushes to `main` deploy production

**Evidence.** The GitHub branch-protection API returns `Branch not protected` for
`main`. The repository ruleset list is empty. The repository is public.
`deploy.yml` triggers on `push` to `main` and `deploy-investor.yml` triggers on
`push` to `main` for matching paths.

**Impact.** Any principal with push access can place a commit on `main` with no
review and no status check, and that commit deploys to production automatically.
This defeats the repository-first deploy discipline that `AGENTS.md` states and
that the roadmap treats as a closed foundation.

**Why environments do not compensate.** `deploy.yml` declares
`environment: production`, but that environment has **no protection rules**, so it
adds no approval gate. Verified via the environments API:

| Environment | Protection |
| --- | --- |
| `production` | none |
| `production-db-changes` | `required_reviewers: 1`, plus a branch policy |

So the reviewed-DDL boundary is genuinely enforced, while the ordinary production
deploy path is not gated at all.

**Smallest safe remediation.** Add a ruleset on `main` requiring a pull request
and the `verify` job, and add required reviewers to the `production` environment.
Both are GitHub settings changes and cannot be made from the repository.

**Correction to an earlier report.** Previous DB-governance work flagged that the
`production-db-changes` reviewer requirement was unverifiable from code and might
be decorative. That is now measured and **it is configured**. The warning is
withdrawn.

### P0-2: `privacyGuard` never redacts, because it runs before authentication

**Evidence.** `applyPrivacyRedaction` in `src/server/middleware/privacy.ts`
returns immediately unless `req.user?.brainId` or `req.user?.identity === 'brain'`
is truthy:

```ts
const isAnonymous = req.user?.brainId || req.user?.identity === 'brain';
if (!isAnonymous) return;
```

`req.user` is assigned only inside `authenticate` (`src/server/middleware/auth.ts:14`).
In `server.ts`, `app.use(privacyGuard)` is line 131, while `authenticate` is applied
per-route from line 136 onward. At the moment `privacyGuard` executes, `req.user`
is always `undefined`, so the guard returns before redacting anything.

**Why the test suite did not catch it.** `src/tests/privacy-sanitizers.test.ts`
constructs a request object with `user: { identity: 'brain', ... }` already
populated and calls `applyPrivacyRedaction` directly. The function is correct in
isolation; the wiring is not. The test asserts the unit, never the middleware
order.

**Impact.** The stated purpose of this middleware, per its own comment, is to keep
IP, User-Agent, and forwarded headers out of system logs for anonymous Brain ID
users. That protection is inert in production. The impact is bounded by a
separate fact verified here: no application code logs `req.ip`, forwarded
headers, or User-Agent, and `createSafeLogger` is used across the runtime. So this
is a **non-functional control, not an active leak** in application logs. It
remains P0 because the privacy inventory and the roadmap treat this boundary as
existing, and #222/#226 are sequenced on top of it.

**Remediation is not a simple reorder.** Both rate limiters in `server.ts`
(`apiLimiter`, `authLimiter`, `investorLeadLimiter`) declare no `keyGenerator`, so
`express-rate-limit` keys on `req.ip`. `src/server/routes/chat.ts:31` keys SSE
connection limits on `req.ip` directly. If redaction were made effective for
authenticated Brain ID users, every such user would collapse into the single
`0.0.0.0` bucket and share one rate limit and one SSE quota, converting a privacy
fix into a denial-of-service surface.

Any fix must therefore separate the limiter key from the loggable value, for
example by deriving a per-identity or salted-hash limiter key before redaction,
rather than by moving `privacyGuard` after `authenticate`. This needs a design
decision and is out of scope for an audit write-set.

### P1-1: `p.kognitika.ru` sends none of the four security headers its config declares

**Evidence.** `deployment/nginx-p-kognitika.conf` declares, at `server` level:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header X-Frame-Options "DENY" always;
```

Live responses from `https://p.kognitika.ru/` contain none of these four, and no
CSP.

**Mechanism, verified rather than assumed.** nginx `add_header` does not inherit
into a `location` block that declares its own `add_header`. Every `location` in
this file declares one, so all four server-level headers are discarded for every
served path. The deployed file matches the repository: `/robots.txt` returns
`Cache-Control: no-cache` **twice**, which is exactly what the repo's
`expires -1` plus explicit `add_header Cache-Control "no-cache"` produces in that
location block. So this is a defect in the committed configuration, not
server-side drift.

**Impact.** The investor microsite is served without clickjacking, MIME-sniffing,
referrer, or permissions protection, and without CSP. `kognitika.ru` is unaffected,
because its headers come from Helmet in the Express runtime rather than from nginx.

**Smallest safe remediation.** Move the four headers into an nginx snippet
`include`d inside each `location`, or repeat them per `location`. Requires an nginx
reload through the investor deploy workflow.

### P1-2: CORS allowlist advertises three origins that cannot be reached over TLS

**Evidence.** `deploy.yml` upserts this production `CORS_ORIGIN`:

```
https://kognitika.ru,https://www.kognitika.ru,https://kognitika.syntog.ru,
https://admin.kognitika.syntog.ru,https://m.kognitika.ru,
https://m.kognitika.syntog.ru,https://p.kognitika.ru
```

Measured reachability:

| Origin | Result |
| --- | --- |
| `www.kognitika.ru` | resolves, but TLS handshake fails |
| `m.kognitika.ru` | does not resolve |
| `admin.kognitika.syntog.ru` | does not resolve |
| `m.kognitika.syntog.ru` | resolves, certificate does not match hostname |

**Root cause.** `certbot` is invoked for `kognitika.ru` only (`deploy.yml`), for
`p.kognitika.ru` only (`deploy-investor.yml`), and for `m.kognitika.syntog.ru` only
in the manual `deployment/deploy-m-kognitika.sh`. No workflow ever requests a
certificate covering `www.kognitika.ru`. `deployment/nginx-kognitika.ru.conf`
declares `server_name kognitika.ru` without the `www` form, so the apex certificate
does not cover it either.

**DNS observation for criterion 5.** The apex and `www` both have A records, and
they are **not identical**. Addresses are deliberately not recorded here. This
confirms the DNS divergence #221 reported.

**Impact.** An allowlist entry for an origin that cannot serve TLS is not a direct
vulnerability, but it is a false statement of the trust boundary: it implies four
hostnames are supported product surfaces when they are not. `admin.kognitika.syntog.ru`
is the most consequential, because an allowlisted admin origin that does not
resolve invites someone to make it resolve.

**Smallest safe remediation.** Reduce `CORS_ORIGIN` to origins that actually serve
the product, and either provision `www` properly or drop it. This is a change to
the upsert block in `deploy.yml`.

### P2-1: no log field, access, retention, or deletion owner is declared anywhere

**Evidence.** Repository-wide search finds no `access_log`, `error_log`,
`log_format`, `logrotate`, or retention declaration. `.env.example` declares only
`LOG_LEVEL=info` and `LOG_FORMAT=pretty`. The three nginx configs declare no
logging directives, so each host uses the nginx defaults, which include client
address.

**Both proxy configs forward the client address to the application**:

```nginx
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

and `resolveTrustProxy` returns `'loopback'` in production, so Express trusts that
hop and populates `req.ip` from it.

**Impact.** Criterion 4 of #221 cannot be satisfied from the repository. Nginx
access logs, host logs, backup logs, and CI logs are outside declared
configuration, so their fields, access list, retention period, and deletion owner
are unknown. Until they are declared, no retention or deletion claim can be made.

**Smallest safe remediation.** Declare `log_format` and `access_log` explicitly per
host, decide whether client address is retained at all, and record the retention
window and deletion owner in this document. Any change to existing log content is
an operational change requiring an owner.

## 4. Confirmed non-findings

These were checked and are sound. Recording them so future work does not re-litigate them.

- **No `Set-Cookie` on any reachable public host.** Verified on `kognitika.ru` root
  and `/api/health`, and on `p.kognitika.ru` root. Consistent with the identity
  model, which uses browser storage rather than cookies.
- **`kognitika.ru` carries a complete security header set.** Helmet supplies CSP
  (`default-src 'self'`, `object-src 'none'`, `script-src 'self'`,
  `frame-ancestors 'self'`), HSTS with `includeSubDomains` and a one-year max-age,
  `nosniff`, `no-referrer`, COOP and CORP `same-origin`.
- **Production CSP is stricter than development, and intentionally so.** `server.ts`
  passes `contentSecurityPolicy: undefined` in production, which in Helmet 8 means
  "enable with defaults"; the relaxed `unsafe-inline`/`unsafe-eval` policy applies
  only to non-production. The measured production CSP above confirms defaults are
  active.
- **CORS fails closed.** `resolveCorsConfig` refuses a production wildcard and
  denies cross-origin browser requests when the production allowlist is empty.
- **No third-party analytics or tag SDK.** No configured Google Analytics, Yandex
  Metrika, Clarity, or active Sentry client integration was found in source, and no
  third-party host appears in the measured CSP.
- **Application logging is redaction-first.** `createSafeLogger` redacts by key
  pattern and by value pattern for email, Brain ID, and JWT shapes. No call site
  logs `req.ip`, forwarded headers, or User-Agent.
- **The DB preflight is metadata-only.** `scripts/check-migration-baseline.mjs`
  queries `pg_tables`, `pg_type`, `pg_enum`, and `_prisma_migrations` only. It reads
  no application rows, so it is the correct instrument for criterion 3.

## 5. Acceptance criteria status

| # | Criterion | Status |
| --- | --- | --- |
| 1 | Immutable deployed SHA, checkout path, unit, branch protection, trigger per hostname | **partial.** SHA, trigger, and branch protection measured. Checkout path and unit are declared but unverified on host |
| 2 | Reconcile deployed build with a reviewed commit, or document rollback | **met.** `49168ca` is `origin/main` HEAD, reviewed via PR #236 |
| 3 | Metadata-level DB ownership and schema identity, no rows or credentials | **not met.** Requires production `DATABASE_URL`, which this audit must not obtain. Instrument identified |
| 4 | Inventory Nginx, host, CDN/DNS, backup, CI logs: fields, access, retention, deletion owner | **not met.** Nothing is declared in the repository. See P2-1 |
| 5 | Verify cookies, CSP, CORS, DNS/TLS, third-party subprocessors across public hostnames | **met.** See findings P1-1, P1-2 and confirmed non-findings |
| 6 | Record findings in a reviewed document with no secrets, identifiers, IPs, tokens, telemetry | **met.** This document |

Criterion 3 and criterion 4 both require an operator with production access.
Neither can be closed by a repository change, and neither should be marked done
without recorded evidence.

## 6. Recommended sequence

The findings are not equally urgent, and one of them must not be rushed.

1. **P0-1 first**, because it is a settings change with no code risk and it
   currently allows unreviewed production deploys. Add a `main` ruleset and
   `production` environment reviewers.
2. **P1-2 next**, because shrinking the CORS allowlist to reachable origins is a
   small, testable change to `deploy.yml` and removes a false trust boundary.
3. **P1-1 next**, a scoped nginx change for the investor host.
4. **P2-1 next**, declare log format and retention, then complete criterion 4 here.
5. **P0-2 last, with a design decision.** It is P0 in severity but it must not be
   fixed by reordering middleware, because the rate limiters and SSE limiter key on
   `req.ip`. It needs a limiter-key design that survives redaction, and it should
   land before #222 and #226 build further privacy guarantees on top of it.

Criterion 3 can proceed in parallel whenever an operator can run the existing
metadata-only preflight against production and record the result.
