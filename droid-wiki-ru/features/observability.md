# Observability (Sentry, Logging, Metrics)

**Sentry DSN**: `SENTRY_DSN` (env) · **Log Level**: `LOG_LEVEL` (default: `info`) · **Metrics**: Prometheus `/metrics` endpoint

---

## Архитектура наблюдаемости

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Frontend   │  │   Backend   │  │  Socket.io  │              │
│  │  (React)    │  │  (Express)  │  │  (Real-time)│              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼──────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Sentry (Error Tracking)                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Frontend Errors    │  Backend Errors   │  Performance    │  │
│  │  React Error Bdy    │  Express Handlers │  Tracing (10%)  │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Structured Logs (Pino)                       │
│  JSON → stdout → Loki/Grafana / Datadog / CloudWatch             │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Metrics (Prometheus)                         │
│  /metrics endpoint → Prometheus → Grafana Dashboards             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sentry Configuration

### Frontend (`src/lib/sentry.ts`)

```typescript
import * as Sentry from '@sentry/react';
import { browserTracingIntegration, replayIntegration } from '@sentry/browser';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.MODE; // development | production

if (SENTRY_DSN && ENV === 'production') {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,
    release: import.meta.env.VITE_APP_VERSION, // git hash
    integrations: [
      browserTracingIntegration({
        // Trace 10% of transactions
        tracePropagationTargets: ['https://kognitika.ru/api/**', '/api/**'],
        shouldCreateSpanForRequest: (url) => url.startsWith('/api/'),
      }),
      replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
        // Only replay on errors
        networkRequestBody: true,
        networkResponseBody: true,
      }),
    ],
    // Privacy: never send PII
    beforeSend(event) {
      return sanitizeEvent(event);
    },
    beforeSendTransaction(transaction) {
      return sanitizeTransaction(transaction);
    },
    // Performance
    tracesSampleRate: 0.1, // 10%
    profilesSampleRate: 0.1,
    // Replay
    replaysSessionSampleRate: 0.01, // 1% sessions
    replaysOnErrorSampleRate: 1.0, // 100% on error
    // Ignore
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      /^Script error\.?$/,
      /^Network Error$/,
      /^Failed to fetch$/,
    ],
  });
}

// Error Boundary integration
export function captureErrorBoundary(error: Error, info: React.ErrorInfo) {
  Sentry.captureException(error, {
    contexts: { react: { componentStack: info.componentStack } },
    tags: { error_boundary: 'true' },
  });
}
```

### Backend (`src/server/sentry.ts`)

```typescript
import * as Sentry from '@sentry/node';
import { Express } from 'express';

export function initSentry(app: Express) {
  if (!process.env.SENTRY_DSN || process.env.NODE_ENV !== 'production') return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.GIT_COMMIT,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration({ app }),
      Sentry.prismaIntegration(),
    ],
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    beforeSend(event) {
      return sanitizeEvent(event);
    },
  });

  // Request handler (must be first middleware)
  app.use(Sentry.Handlers.requestHandler());
  // Tracing handler
  app.use(Sentry.Handlers.tracingHandler());
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log locally
  logger.error(err, { path: req.path, userId: req.user?.id });

  // Send to Sentry
  Sentry.captureException(err, {
    extra: { path: req.path, method: req.method, userAgent: req.get('user-agent') },
    user: req.user ? { id: req.user.id, brainId: req.user.brainId } : undefined,
  });

  // Respond
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
}

// Error handler (must be last)
app.use(Sentry.Handlers.errorHandler());
```

---

## Privacy Sanitization

```typescript
// src/lib/sentry-sanitize.ts

const SENSITIVE_KEYS = [
  'authorization', 'auth', 'bearer', 'token', 'jwt',
  'password', 'hash', 'secret', 'key', 'cookie',
  'brainid', 'brain_id', 'email', 'localstorage',
  'sessionid', 'refresh', 'csrf', 'xsrf',
];

const SENSITIVE_REGEX = [
  /[a-f0-9-]{36}/gi,           // UUIDs
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, // emails
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi, // JWTs
  /\$2[aby]\$\d+\$[./A-Za-z0-9]{53}/gi, // bcrypt hashes
];

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    let sanitized = value;
    for (const regex of SENSITIVE_REGEX) {
      sanitized = sanitized.replace(regex, '[REDACTED]');
    }
    return sanitized;
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(val);
      }
    }
    return sanitized;
  }
  return value;
}

export function sanitizeEvent(event: any) {
  // Request data
  if (event.request) {
    event.request = sanitizeValue(event.request);
    if (event.request.cookies) event.request.cookies = '[REDACTED]';
    if (event.request.headers) {
      event.request.headers = sanitizeValue(event.request.headers);
    }
  }
  // Extra contexts
  if (event.extra) event.extra = sanitizeValue(event.extra);
  if (event.contexts) event.contexts = sanitizeValue(event.contexts);
  // User
  if (event.user) {
    event.user = { id: event.user.id }; // only anonymous ID
  }
  return event;
}

export function sanitizeTransaction(transaction: any) {
  if (transaction.request) transaction.request = sanitizeValue(transaction.request);
  return transaction;
}
```

---

## Structured Logging (Pino)

### `src/lib/logger.ts`

```typescript
import pino from 'pino';
import { safeError } from './safe-logger';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const IS_PROD = process.env.NODE_ENV === 'production';

const transport = IS_PROD
  ? pino.transport({ target: 'pino/file', options: { destination: 1 } }) // stdout
  : pino.transport({ target: 'pino-pretty', options: { colorize: true } });

export const logger = pino(
  {
    level: LOG_LEVEL,
    base: {
      service: 'kognitika',
      version: process.env.GIT_COMMIT || 'dev',
      environment: process.env.NODE_ENV,
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
        'req.body.brainId',
        'res.headers["set-cookie"]',
        '*.token', '*.jwt', '*.password', '*.hash', '*.secret',
        '*.brainId', '*.brain_id', '*.email',
      ],
      censor: '[REDACTED]',
    },
    serializers: {
      err: (err) => ({
        name: err.name,
        message: safeError(err),
        stack: err.stack,
        code: err.code,
      }),
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
        remoteAddress: req.ip,
        userAgent: req.get('user-agent'),
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  },
  transport
);

// Child loggers per module
export const createModuleLogger = (module: string) => logger.child({ module });
```

### Usage

```typescript
// In any module
import { createModuleLogger } from '../lib/logger';

const logger = createModuleLogger('duels');

logger.info('Duel created', { duelId, creatorId, moduleId });
logger.warn('Slow matchmaking', { duelId, waitTimeMs: 5000 });
logger.error(err, 'Duel action failed', { duelId, userId, action });
```

---

## Metrics (Prometheus)

### `src/server/metrics.ts`

```typescript
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();
register.setDefaultLabels({ app: 'kognitika' });
collectDefaultMetrics({ register, prefix: 'kognitika_' });

// HTTP
export const httpRequestsTotal = new Counter({
  name: 'kognitika_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'kognitika_http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Business
export const sessionsCreated = new Counter({
  name: 'kognitika_sessions_created_total',
  help: 'Game sessions created',
  labelNames: ['game_type', 'completed'],
  registers: [register],
});

export const duelsCreated = new Counter({
  name: 'kognitika_duels_created_total',
  help: 'Duels created',
  labelNames: ['module_id'],
  registers: [register],
});

export const duelMatchmakingDuration = new Histogram({
  name: 'kognitika_duel_matchmaking_duration_seconds',
  help: 'Time to find opponent',
  labelNames: ['module_id'],
  buckets: [1, 5, 10, 30, 60],
  registers: [register],
});

export const activeUsers = new Gauge({
  name: 'kognitika_active_users',
  help: 'Currently active users',
  labelNames: ['page'],
  registers: [register],
});

export const wsConnections = new Gauge({
  name: 'kognitika_ws_connections',
  help: 'Active WebSocket connections',
  labelNames: ['namespace'],
  registers: [register],
});

export const wasmAnalyzeDuration = new Histogram({
  name: 'kognitika_wasm_analyze_duration_seconds',
  help: 'WASM analyzeSession duration',
  labelNames: ['event_count_bucket'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

export const errorsTotal = new Counter({
  name: 'kognitika_errors_total',
  help: 'Total errors',
  labelNames: ['type', 'module'],
  registers: [register],
});
```

### Middleware

```typescript
// src/server/middleware/metrics.ts
export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    const path = req.route?.path || req.path;

    httpRequestsTotal.inc({ method: req.method, path, status: res.statusCode });
    httpRequestDuration.observe({ method: req.method, path }, duration);
  });
  next();
}

app.use(metricsMiddleware);
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});
```

---

## Grafana Dashboards

### Dashboard: API Health

| Panel | Query | Alert |
|---|---|---|
| **Request Rate** | `sum(rate(kognitika_http_requests_total[5m])) by (method)` | — |
| **Error Rate** | `sum(rate(kognitika_http_requests_total{status=~"5.."}[5m])) / sum(rate(kognitika_http_requests_total[5m]))` | > 1% |
| **P95 Latency** | `histogram_quantile(0.95, sum(rate(kognitika_http_request_duration_seconds_bucket[5m])) by (le, path))` | > 500ms |
| **P99 Latency** | `histogram_quantile(0.99, ...)` | > 2s |

### Dashboard: Business Metrics

| Panel | Query |
|---|---|
| **Sessions/min** | `sum(rate(kognitika_sessions_created_total[5m])) by (game_type)` |
| **Completion Rate** | `sum(rate(kognitika_sessions_created_total{completed="true"}[5m])) / sum(rate(kognitika_sessions_created_total[5m]))` |
| **Duels Created** | `sum(rate(kognitika_duels_created_total[5m])) by (module_id)` |
| **Matchmaking P95** | `histogram_quantile(0.95, sum(rate(kognitika_duel_matchmaking_duration_seconds_bucket[5m])) by (le, module_id))` |
| **Active Users** | `kognitika_active_users` |
| **WS Connections** | `kognitika_ws_connections` |

### Dashboard: WASM Performance

| Panel | Query |
|---|---|
| **Analyze Duration P50/P95/P99** | `histogram_quantile(0.50/0.95/0.99, sum(rate(kognitika_wasm_analyze_duration_seconds_bucket[5m])) by (le, event_count_bucket))` |
| **Fallback Rate** | `sum(rate(kognitika_wasm_fallback_total[5m])) / sum(rate(kognitika_analyze_session_total[5m]))` |
| **Memory Peak** | `kognitika_wasm_memory_peak_bytes` |

---

## Alerting Rules (PrometheusRule)

```yaml
groups:
- name: kognitika-alerts
  interval: 30s
  rules:
  # API
  - alert: HighErrorRate
    expr: |
      sum(rate(kognitika_http_requests_total{status=~"5.."}[5m]))
      / sum(rate(kognitika_http_requests_total[5m])) > 0.01
    for: 2m
    labels: { severity: critical }
    annotations:
      summary: "High 5xx error rate ({{ $value | humanizePercentage }})"
      runbook_url: "https://github.com/xodapi/kognitika/wiki/Runbook-HighErrorRate"

  - alert: HighLatencyP95
    expr: |
      histogram_quantile(0.95, sum(rate(kognitika_http_request_duration_seconds_bucket[5m])) by (le, path)) > 0.5
    for: 5m
    labels: { severity: warning }
    annotations:
      summary: "P95 latency > 500ms on {{ $labels.path }}"

  # Business
  - alert: MatchmakingDegraded
    expr: |
      histogram_quantile(0.95, sum(rate(kognitika_duel_matchmaking_duration_seconds_bucket[5m])) by (le)) > 30
    for: 5m
    labels: { severity: warning }
    annotations:
      summary: "Duel matchmaking P95 > 30s"

  - alert: SessionCompletionRateLow
    expr: |
      sum(rate(kognitika_sessions_created_total{completed="true"}[15m]))
      / sum(rate(kognitika_sessions_created_total[15m])) < 0.3
    for: 10m
    labels: { severity: warning }
    annotations:
      summary: "Session completion rate < 30%"

  # Infrastructure
  - alert: WASMFallbackRateHigh
    expr: |
      sum(rate(kognitika_wasm_fallback_total[5m]))
      / sum(rate(kognitika_analyze_session_total[5m])) > 0.1
    for: 5m
    labels: { severity: warning }
    annotations:
      summary: "WASM fallback rate > 10%"

  - alert: TooManyWSConnections
    expr: kognitika_ws_connections > 10000
    for: 5m
    labels: { severity: warning }
```

---

## Runbooks

### Runbook: High Error Rate
1. Check Sentry for new error spikes
2. Check logs: `kubectl logs -l app=kognitika --tail=100`
3. Check recent deploy: `git log --oneline -10`
4. If new deploy → rollback: `git revert HEAD && git push`
5. If DB issue → check connections, slow queries
6. If external API → check status page

### Runbook: High Latency
1. Check `/metrics` → `http_request_duration_seconds`
2. Identify slow endpoints
3. Check DB: `pg_stat_statements` top queries
4. Check external calls (Sentry, email, etc.)
5. Consider scaling: `kubectl scale deployment kognitika --replicas=3`

### Runbook: Matchmaking Degraded
1. Check active duels: `SELECT count(*) FROM duel WHERE status IN ('waiting','playing');`
2. Check matchmaking queue length
3. Check WS connections: `kognitika_ws_connections`
4. If stuck duels → admin force-finish

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SENTRY_DSN` | — | Sentry DSN (required for prod) |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` | Transaction sampling |
| `SENTRY_PROFILES_SAMPLE_RATE` | `0.1` | Profiling sampling |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `LOG_FORMAT` | `json` | `json` or `pretty` |
| `METRICS_ENABLED` | `true` | Enable `/metrics` endpoint |

---

## Testing Observability

```bash
# Local Sentry (development)
SENTRY_DSN=https://xxx@sentry.io/xxx pnpm dev

# Test error
curl -X POST http://localhost:3006/api/test/error

# View metrics
curl http://localhost:3006/metrics | grep kognitika_

# Test log output
LOG_LEVEL=debug pnpm dev 2>&1 | head -50
```

---

## Файлы

| Путь | Назначение |
|---|---|
| `src/lib/sentry.ts` | Frontend Sentry init |
| `src/server/sentry.ts` | Backend Sentry init |
| `src/lib/sentry-sanitize.ts` | Privacy sanitization |
| `src/lib/logger.ts` | Pino logger |
| `src/lib/safe-logger.ts` | `safeError`, `createSafeLogger` |
| `src/server/metrics.ts` | Prometheus metrics |
| `src/server/middleware/metrics.ts` | HTTP metrics middleware |
| `monitoring/prometheus/rules.yml` | Alerting rules |
| `monitoring/grafana/dashboards/*.json` | Dashboard JSON |
