# Incident Response & Runbooks

**SLA**: P0 (Critical) — 15 мин реагирования, P1 (Major) — 1 час, P2 (Minor) — 4 часа · **On-call**: Telegram @kognitika-oncall · **Runbooks**: `docs/runbooks/*.md`

---

## Severity Levels

| Severity | Definition | Response Time | Escalation | Examples |
|---|---|---|---|---|
| **P0 — Critical** | Service down, data loss, security breach | 15 мин | Page on-call immediately → CTO | API 5xx > 50%, DB down, WS unavailable, PII leak |
| **P1 — Major** | Core feature broken, degraded performance | 1 час | On-call + team lead | Duels not matching, export fails, auth broken, FPS < 30 |
| **P2 — Minor** | Non-critical feature, cosmetic, workaround exists | 4 часа | Next business day | Typo, minor UI bug, analytics delay, notifications delayed |
| **P3 — Low** | Enhancement, tech debt, documentation | Next sprint | — | Code cleanup, new metric, doc update |

---

## On-Call Rotation

| Неделя | Primary | Secondary | Escalation |
|---|---|---|---|
| 1 | @dev1 | @dev2 | @techlead |
| 2 | @dev2 | @dev3 | @techlead |
| 3 | @dev3 | @dev1 | @cto |
| 4 | @dev1 | @dev2 | @cto |

**Tools**: Telegram group `kognitika-oncall`, PagerDuty (optional), Grafana Alerting → Telegram

---

## Incident Lifecycle

```
DETECT → ACKNOWLEDGE → INVESTIGATE → MITIGATE → RESOLVE → POSTMORTEM
   │           │            │           │         │          │
   ▼           ▼            ▼           ▼         ▼          ▼
Alert      Assign       Root Cause   Fix/        Verify    Document
fired      owner        Analysis     Workaround  fix       + Action Items
```

### States
- **Detected**: Alert fired, not yet acknowledged
- **Acknowledged**: On-call accepted, investigating
- **Mitigated**: Workaround applied, impact reduced
- **Resolved**: Root cause fixed, service healthy
- **Closed**: Postmortem written, action items tracked

---

## Runbooks (Quick Reference)

### RUNBOOK-001: High API Error Rate (5xx > 5%)

**Symptoms**: Sentry spike, `/metrics` shows `http_requests_total{status=~"5.."}` ↑
**Impact**: Users can't save sessions, login fails, exports fail

| Step | Action | Command/Check |
|---|---|---|
| 1 | Check deploy | `git log --oneline -5` — recent deploy? |
| 2 | Check logs | `kubectl logs -l app=kognitika --tail=100 -f` |
| 3 | Check DB | `pg_stat_activity` — locks, long queries |
| 4 | Check external | Sentry, email, storage — reachable? |
| 5 | Rollback if deploy | `git revert HEAD && git push origin main` |
| 6 | Scale if load | `kubectl scale deployment kognitika --replicas=5` |
| 7 | Circuit breaker | Enable maintenance mode via admin panel |

**Escalation**: If not resolved in 15 min → P0 → Page secondary + tech lead

---

### RUNBOOK-002: Database Connection Pool Exhausted

**Symptoms**: `P2024: Connection pool timeout`, `P2002: Too many connections`
**Impact**: All DB operations fail

| Step | Action |
|---|---|
| 1 | Check PgBouncer: `psql -h pgbouncer -c "SHOW POOLS;"` |
| 2 | Check app logs: `grep "pool timeout" logs` |
| 3 | Kill idle: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle' AND state_change < now() - interval '5 min';` |
| 4 | Increase pool: `kubectl set env deployment/kognitika DATABASE_POOL_SIZE=30` |
| 5 | Restart PgBouncer: `kubectl rollout restart deployment/pgbouncer` |
| 6 | Check for leak: `SELECT count(*) FROM pg_stat_activity WHERE application_name='kognitika';` |

**Root cause usually**: Missing `await` in Prisma, long transactions, N+1 queries

---

### RUNBOOK-003: WebSocket / Socket.io Disconnections

**Symptoms**: Duels stall, real-time updates stop, `ws_connections` gauge drops
**Impact**: Duels unplayable, SymbolChat broken

| Step | Action |
|---|---|
| 1 | Check Redis: `redis-cli INFO clients` — connected clients, memory |
| 2 | Check Socket.io adapter: `io.engine.clientsCount` vs `io.sockets.adapter.rooms.size` |
| 3 | Check network: `kubectl get endpoints kognitika` — pods ready? |
| 4 | Restart WS pods: `kubectl rollout restart deployment/kognitika-ws` |
| 5 | If Redis OOM: `redis-cli CONFIG SET maxmemory 512mb` + restart |
| 6 | Check sticky sessions: Ingress `affinity: cookie` enabled? |

---

### RUNBOOK-004: High Latency / P95 > 500ms

**Symptoms**: Grafana alert `HighLatencyP95`, users report slowness

| Step | Action |
|---|---|
| 1 | Check `/metrics` — `http_request_duration_seconds` by path |
| 2 | Identify slow endpoint: `top -c` on pod, `pg_stat_statements` |
| 3 | Check DB: `EXPLAIN ANALYZE` on slow query |
| 4 | Add index / fix N+1 / optimize query |
| 5 | Check external calls: Sentry, email, storage — timeout? |
| 6 | Enable caching: `Cache-Control`, Redis cache for heavy endpoints |
| 7 | Scale horizontally: `kubectl scale deployment kognitika --replicas=5` |

---

### RUNBOOK-005: WASM Analytics Fallback Rate > 10%

**Symptoms**: Sentry `wasm_fallback` events ↑, `analyzeSession` errors
**Impact**: Analytics export slower, some exports fail

| Step | Action |
|---|---|
| 1 | Check WASM chunk loaded: Network tab → `kognitika-core.wasm` 200? |
| 2 | Check memory: `performance.memory.usedJSHeapSize` < 100MB? |
| 3 | Check browser support: `WebAssembly.instantiateStreaming` available? |
| 4 | Fallback to JS: Already automatic, verify `import('@/lib/analyze-session-js')` works |
| 5 | If WASM corrupt: Rebuild `pnpm build:wasm`, redeploy |
| 6 | Monitor: `wasm_analyze_duration_seconds` histogram |

---

### RUNBOOK-006: Deployment Failed / Rollback Needed

**Symptoms**: CI/CD red, health check fails, smoke test fails

| Step | Action |
|---|---|
| 1 | **Don't panic** — production still on previous version |
| 2 | Check CI logs: which stage failed? (lint, test, build, deploy, health) |
| 3 | If health check failed: `curl https://kognitika.ru/api/health` — what's the response? |
| 4 | Check logs on server: `journalctl -u kognitika -f` |
| 5 | **Rollback**: `git revert <bad-commit> && git push origin main` |
| 6 | Or manual: `ssh server "cd /opt/kognitika && git reset --hard HEAD~1 && pnpm install && pnpm build && systemctl restart kognitika"` |
| 6 | Verify: health check + smoke test (Playwright) |
| 7 | Postmortem: why CI didn't catch it? |

---

### RUNBOOK-007: Security Incident (PII Leak, Auth Bypass)

**Symptoms**: Sentry `privacy_violation`, audit log anomaly, user report

| Step | Action |
|---|---|
| 1 | **IMMEDIATE**: Enable maintenance mode via admin panel |
| 2 | Revoke compromised tokens: `DELETE FROM sessions WHERE user_id IN (...)` |
| 3 | Rotate secrets: `JWT_SECRET`, `DATABASE_URL`, `SENTRY_DSN` |
| 4 | Check logs: `grep -i "brainId\|email\|token" logs` — what leaked? |
| 5 | Notify users if required (GDPR 72h) |
| 6 | Patch vulnerability, deploy hotfix |
| 7 | Full audit: `pnpm audit`, `npm audit`, dependency scan |
| 8 | Postmortem + security review |

---

### RUNBOOK-008: Certificate Expiry / TLS Issues

**Symptoms**: Browser `NET::ERR_CERT_DATE_INVALID`, `curl` fails

| Step | Action |
|---|---|
| 1 | Check: `openssl s_client -connect kognitika.ru:443 -servername kognitika.ru < /dev/null 2>/dev/null | openssl x509 -noout -dates` |
| 2 | If Let's Encrypt: `certbot renew --dry-run` |
| 3 | Force renew: `certbot renew --force-renewal` |
| 4 | Reload nginx: `nginx -s reload` |
| 4 | Verify: `curl -I https://kognitika.ru` |

---

## Communication Templates

### Incident Start (Telegram)
```
🚨 INCIDENT P0/P1
Service: Kognitika API
Symptom: [API 5xx > 10% / Duels not matching / etc.]
Started: 2026-07-30 14:32 MSK
Owner: @dev1
Status: Investigating
Runbook: RUNBOOK-001
```

### Update (every 15 min for P0, 30 min for P1)
```
📝 UPDATE #3
Status: Mitigated / Investigating / Resolved
Root cause: [DB pool exhausted due to missing await in new endpoint]
Actions taken: [Killed idle connections, increased pool, deployed fix]
ETA to resolve: 10 min
```

### Resolution
```
✅ RESOLVED
Incident: P0 High API Error Rate
Duration: 23 min
Root cause: Missing await in /api/analytics/export causing connection leak
Fix: PR #1234 (await added), pool size increased to 30
Action items:
- [ ] Add lint rule for unawaited promises
- [ ] Add integration test for export endpoint
Postmortem: https://github.com/xodapi/kognitika/wiki/Postmortem-2026-07-30
```

---

## Postmortem Template

```markdown
# Postmortem: [Title] — YYYY-MM-DD

## Summary
- **Severity**: P0/P1/P2
- **Duration**: XX min
- **Impact**: [Users affected, features broken]
- **Owner**: @dev

## Timeline
| Time (MSK) | Event |
|---|---|
| 14:32 | Alert fired: 5xx > 5% |
| 14:34 | @dev1 acknowledged |
| 14:36 | Identified recent deploy v1.2.3 |
| 14:38 | Rolled back to v1.2.2 |
| 14:40 | Health check green |
| 14:45 | Resolved |

## Root Cause
[Technical explanation — 5 Whys]

## Contributing Factors
- [ ] Missing test coverage
- [ ] Insufficient CI checks
- [ ] Manual deploy step
- [ ] Insufficient monitoring

## Action Items
| # | Action | Owner | Due | Tracking |
|---|---|---|---|---|
| 1 | Add integration test for export | @dev2 | 2026-08-05 | #123 |
| 2 | Add lint rule for unawaited promises | @dev1 | 2026-08-03 | #124 |
| 3 | Improve deploy smoke test | @dev3 | 2026-08-10 | #125 |

## Lessons Learned
- What went well?
- What didn't?
- What got lucky?

## Links
- Sentry issue: https://sentry.io/...
- Grafana dashboard: https://grafana/...
- Deploy: https://github.com/xodapi/kognitika/actions/runs/...
```

---

## Monitoring Coverage Checklist

| Component | Metric | Alert | Dashboard |
|---|---|---|---|
| **API** | 5xx rate, latency p95, RPS | ✅ | ✅ |
| **DB** | Connections, pool usage, slow queries | ✅ | ✅ |
| **Redis** | Memory, connected clients, hit rate | ✅ | ✅ |
| **WS** | Connections, rooms, messages/sec | ✅ | ✅ |
| **WASM** | Analyze duration, fallback rate | ✅ | ✅ |
| **Business** | Sessions/min, duels/min, exports/min | ✅ | ✅ |
| **Infra** | CPU, RAM, disk, network | ✅ | ✅ |
| **Cert** | TLS expiry days | ✅ | — |

---

## Emergency Contacts

| Role | Name | Telegram | Phone |
|---|---|---|---|
| **Tech Lead** | — | @techlead | — |
| **Backend Lead** | — | @backendlead | — |
| **DevOps** | — | @devops | — |
| **CTO** | — | @cto | — |
| **Security** | — | @security | — |

---

## Файлы

| Путь | Назначение |
|---|---|
| `docs/runbooks/RUNBOOK-001-high-error-rate.md` | Детальный runbook |
| `docs/runbooks/RUNBOOK-002-db-pool.md` | |
| `docs/runbooks/RUNBOOK-003-ws-disconnects.md` | |
| `docs/runbooks/RUNBOOK-004-high-latency.md` | |
| `docs/runbooks/RUNBOOK-005-wasm-fallback.md` | |
| `docs/runbooks/RUNBOOK-006-deploy-failed.md` | |
| `docs/runbooks/RUNBOOK-007-security.md` | |
| `docs/runbooks/RUNBOOK-008-cert-expiry.md` | |
| `.github/workflows/alerts.yml` | Alert definitions |
| `monitoring/grafana/dashboards/*.json` | Dashboards |
| `monitoring/prometheus/rules/*.yml` | Alerting rules |
