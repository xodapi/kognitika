# Error Boundaries & Recovery Architecture

**Принцип**: Fail gracefully, recover automatically, notify silently · **Инструменты**: React Error Boundaries + Sentry + Custom Recovery UI

---

## Error Boundary Hierarchy

```
App (RootErrorBoundary)
├── Providers (Auth, Router, Query, Socket)
├── Layout (Header, Footer, Navigation)
│   └── HeaderErrorBoundary
├── Main Content
│   ├── DashboardErrorBoundary
│   │   ├── DailyPracticeErrorBoundary
│   │   ├── CognitiveProfileErrorBoundary
│   │   └── LeaderboardErrorBoundary
│   ├── TrainerErrorBoundary (per trainer route)
│   │   ├── SchulteEngineErrorBoundary
│   │   ├── StroopEngineErrorBoundary
│   │   └── NBackEngineErrorBoundary
│   ├── DuelErrorBoundary
│   │   ├── MatchmakingErrorBoundary
│   │   └── GameplayErrorBoundary
│   ├── SymbolChatErrorBoundary
│   ├── CognitiveMapErrorBoundary
│   ├── FeedbackErrorBoundary
│   ├── IdeasWallErrorBoundary
│   └── AdminPanelErrorBoundary
├── Modals/Portals
│   └── ModalErrorBoundary
└── Global Error Fallback (last resort)
```

---

## Core Error Boundary Component

### `src/components/ErrorBoundary.tsx`

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { captureException, addBreadcrumb } from '@sentry/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Sentry reporting
    captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
      },
      tags: {
        error_boundary: this.constructor.name,
      },
      level: 'error',
    });

    // Breadcrumb for context
    addBreadcrumb({
      category: 'error-boundary',
      message: error.message,
      level: 'error',
      data: { componentStack: errorInfo.componentStack?.slice(0, 500) },
    });

    // Custom handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.resetKeys && this.props.resetKeys.some((k, i) => k !== prevProps.resetKeys?.[i])) {
      this.reset();
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}
```

---

## Default Fallback UI

### `src/components/DefaultErrorFallback.tsx`

```tsx
import { Button, AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  error: Error | null;
  reset: () => void;
}

export function DefaultErrorFallback({ error, reset }: Props) {
  const { t } = useTranslation();

  const isNetworkError = error?.message?.includes('NetworkError') || error?.message?.includes('fetch');
  const isAuthError = error?.message?.includes('401') || error?.message?.includes('Unauthorized');

  return (
    <div className="flex min-h-[300px] items-center justify-center p-6" role="alert">
      <div className="text-center max-w-md space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold">{t('errorBoundary.title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('errorBoundary.description')}</p>
        </div>

        {error && (
          <details className="text-left rounded-border bg-muted p-3 text-sm">
            <summary className="cursor-pointer font-mono">{t('errorBoundary.details')}</summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap font-mono text-xs">
              {error.name}: {error.message}
              {error.stack && `\n\nStack:\n${error.stack.slice(0, 1000)}`}
            </pre>
          </details>
        )}

        <div className="flex gap-3 justify-center">
          <Button variant="outline" size="sm" onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('errorBoundary.retry')}
          </Button>

          {isNetworkError && (
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              {t('errorBoundary.reload')}
            </Button>
          )}

          {isAuthError && (
            <Button variant="secondary" size="sm" onClick={() => window.location.href = '/auth'}>
              {t('errorBoundary.reauth')}
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/'}>
            <Home className="h-4 w-4" />
            {t('errorBoundary.home')}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('errorBoundary.reportId')}: <code>{generateErrorId()}</code>
        </p>
      </div>
    </div>
  );
}

function generateErrorId(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
```

---

## Specialized Boundaries

### Trainer Engine Boundary (Critical — preserves session)

```tsx
// src/components/TrainerErrorBoundary.tsx
import { ErrorBoundary } from './ErrorBoundary';
import { useTrainerStore } from '../hooks/useTrainerStore';

interface Props {
  children: React.ReactNode;
  moduleId: string;
  sessionId: string;
}

export function TrainerErrorBoundary({ children, moduleId, sessionId }: Props) {
  const { pauseSession, resumeSession } = useTrainerStore();

  return (
    <ErrorBoundary
      resetKeys=[moduleId]
      onError={(error, errorInfo) => {
        // Auto-pause to prevent timer drift
        pauseSession(sessionId);
      }}
      fallback={<TrainerErrorFallback moduleId={moduleId} sessionId={sessionId} />}
    >
      {children}
    </ErrorBoundary>
  );
}

function TrainerErrorFallback({ moduleId, sessionId }: Props) {
  const { resumeSession } = useTrainerStore();

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <AlertTriangle className="mx-auto h-12 w-12 text-warning" />
        <h3>Тренировка приостановлена</h3>
        <p className="text-muted-foreground">
          Произошла ошибка в движке {moduleId}. Ваш прогресс сохранён.
        </p>
        <Button onClick={() => resumeSession(sessionId)} size="lg">
          Продолжить тренировку
        </Button>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
          Выйти в меню
        </Button>
      </div>
    </div>
  );
}
```

### Duel Boundary (Critical — syncs with opponent)

```tsx
// src/components/DuelErrorBoundary.tsx
export function DuelErrorBoundary({ children, duelId, userId }: Props) {
  const socket = useDuelSocket();

  return (
    <ErrorBoundary
      onError={(error) => {
        // Notify opponent of disconnect
        socket.emit('duel:disconnect', { duelId, userId, reason: 'error' });
      }}
      fallback={<DuelErrorFallback duelId={duelId} />}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### Admin Panel Boundary (Non-critical — full reload safe)

```tsx
// src/components/AdminErrorBoundary.tsx
export function AdminErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-2">Ошибка в админ-панели</h2>
          <Button onClick={() => window.location.reload()}>Перезагрузить</Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

## Recovery Strategies

| Error Type | Boundary | Recovery Action | User Impact |
|---|---|---|---|
| **Network (fetch/XHR)** | App/Global | Auto-retry (exponential backoff 1s, 2s, 4s) | Toast "Восстановление соединения..." |
| **WebSocket disconnect** | Duel/Socket | `socket.connect()` + state sync | Brief pause, then resume |
| **Auth token expired** | App/Global | Redirect to `/auth` with `returnTo` | Seamless re-login (Brain ID) |
| **WASM init failure** | Trainer/Profile | Fallback to JS implementation | Slightly slower analytics |
| **IndexedDB quota exceeded** | Analytics/Worker | Cleanup old sessions + retry | Transparent |
| **React render error** | Component-specific | Reset boundary + preserve parent state | Component remounts |
| **Out of memory** | Global | `window.location.reload()` | Full reload |

---

## Auto-Retry Logic (Network)

```tsx
// src/hooks/useRetryableQuery.ts
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

export function useRetryableQuery<T>(
  key: string[],
  fn: () => Promise<T>,
  options?: Partial<UseQueryOptions<T>>
) {
  return useQuery({
    queryKey: key,
    queryFn: fn,
    retry: (failureCount, error) => {
      // Don't retry auth errors, 4xx
      if (error instanceof Response && error.status >= 400 && error.status < 500) return false;
      // Retry network errors, 5xx up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30_000,
    ...options,
  });
}
```

---

## Sentry Integration

### `src/lib/sentry.ts`

```tsx
import * as Sentry from '@sentry/react';
import { browserTracingIntegration, replayIntegration } from '@sentry/browser';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENV || 'development',
  release: import.meta.env.VITE_APP_VERSION,

  // Performance
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,

  // Session Replay (errors + 10% sessions)
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    browserTracingIntegration(),
    replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
      networkDetailAllowUrls: [/^\/api\//],
    }),
  ],

  // Privacy: No PII
  beforeSend(event) {
    // Strip Brain ID, emails, tokens from all events
    if (event.request?.cookies) delete event.request.cookies;
    if (event.user?.id) event.user.id = hashBrainId(event.user.id);
    return event;
  },

  // Custom tags
  initialScope: {
    tags: {
      app: 'kognitika',
      platform: 'web',
    },
  },
});

// Error Boundary integration
export function captureErrorBoundaryError(error: Error, componentStack?: string) {
  Sentry.captureException(error, {
    tags: { error_boundary: true },
    extra: { componentStack },
  });
}
```

---

## Error Codes & User Messages

| Code | HTTP | User Message | Action |
|---|---|---|---|
| `NETWORK_ERROR` | — | «Нет соединения. Повторная попытка...» | Auto-retry |
| `UNAUTHORIZED` | 401 | «Сессия истекла. Войдите снова.» | Redirect `/auth` |
| `FORBIDDEN` | 403 | «Нет доступа к этой функции.» | Stay, disable UI |
| `NOT_FOUND` | 404 | «Ресурс не найден.» | Redirect `/dashboard` |
| `VALIDATION_ERROR` | 422 | «Проверьте введённые данные.» | Show field errors |
| `RATE_LIMITED` | 429 | «Слишком много запросов. Подождите.» | Backoff + toast |
| `SERVER_ERROR` | 5xx | «Ошибка сервера. Мы уже знаем.» | Report to Sentry |
| `WASM_LOAD_FAILED` | — | «Аналитика недоступна. Используем упрощённый режим.» | Fallback JS |
| `WEBSOCKET_DISCONNECTED` | — | «Соединение прервано. Переподключение...» | Auto-reconnect |
| `DUEL_DESYNC` | — | «Рассинхронизация с оппонентом. Синхронизация...» | Server sync |
| `STORAGE_QUOTA_EXCEEDED` | — | «Место для данных переполнено. Очистка старых сессий.» | Auto-cleanup |

---

## Testing Error Boundaries

### Unit (Vitest + React Testing Library)

```tsx
// src/components/ErrorBoundary.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { vi } from 'vitest';

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error('Test error');
  return <div>OK</div>;
};

it('renders fallback on error', () => {
  render(
    <ErrorBoundary fallback={<div data-testid="fallback">Error!</div>}>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  );
  expect(screen.getByTestId('fallback')).toBeInTheDocument();
});

it('resets on resetKeys change', () => {
  const { rerender } = render(
    <ErrorBoundary resetKeys={['key1']} fallback={<div>Error</div>}>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  );
  expect(screen.getByText('Error')).toBeInTheDocument();

  rerender(
    <ErrorBoundary resetKeys={['key2']} fallback={<div>Error</div>}>
      <ThrowError shouldThrow={false} />
    </ErrorBoundary>
  );
  expect(screen.getByText('OK')).toBeInTheDocument();
});

it('calls onError callback', () => {
  const onError = vi.fn();
  render(
    <ErrorBoundary onError={onError} fallback={<div>Error</div>}>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  );
  expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
});
```

### E2E (Playwright)

```typescript
// tests/error-boundaries.spec.ts
test('trainer error boundary preserves session on engine crash', async ({ page }) => {
  await page.goto('/schulte');
  await page.click('[data-testid="start"]');
  await page.waitForSelector('[data-testid="cell-1"]');

  // Inject error via console
  await page.evaluate(() => {
    window.__INJECT_ERROR__ = true; // triggers error in engine
  });

  // Should show fallback, not crash page
  await expect(page.locator('text=Тренировка приостановлена')).toBeVisible();
  await expect(page.locator('button:has-text("Продолжить тренировку")')).toBeVisible();

  // Click resume
  await page.click('button:has-text("Продолжить тренировку")');
  await expect(page.locator('[data-testid="cell-1"]')).toBeVisible();
});

test('global network error shows retry toast', async ({ page }) => {
  await page.route('**/api/**', route => route.abort('failed'));
  await page.goto('/dashboard');

  await expect(page.locator('[data-testid="toast"]:has-text("Восстановление соединения")')).toBeVisible();
  await page.unroute('**/api/**');
  await expect(page.locator('[data-testid="toast"]:has-text("Соединение восстановлено")')).toBeVisible({ timeout: 10000 });
});
```

---

## Monitoring & Alerts

### Sentry Alerts

| Alert | Condition | Channel |
|---|---|---|
| **Error Boundary Triggered** | `error_boundary: true` count > 5/min | PagerDuty |
| **New Error Type** | New issue in Sentry | Slack #alerts |
| **Error Rate Spike** | Error rate > 1% of sessions | PagerDuty |
| **WASM Fallback Rate** | `wasm_fallback` tag > 10% | Slack #performance |

### Custom Metrics (Prometheus/Grafana)

```promql
# Error boundary triggers by component
sum(rate(error_boundary_triggered_total[5m])) by (component)

# Recovery success rate
sum(rate(recovery_success_total[5m])) / sum(rate(recovery_attempted_total[5m]))

# WASM fallback rate
sum(rate(wasm_fallback_total[5m])) / sum(rate(analyze_session_total[5m]))
```

---

## Файлы

| Путь | Назначение |
|---|---|
| `src/components/ErrorBoundary.tsx` | Base class component |
| `src/components/DefaultErrorFallback.tsx` | Default fallback UI |
| `src/components/TrainerErrorBoundary.tsx` | Trainer-specific (preserves session) |
| `src/components/DuelErrorBoundary.tsx` | Duel-specific (opponent sync) |
| `src/components/AdminErrorBoundary.tsx` | Admin panel |
| `src/hooks/useRetryableQuery.ts` | React Query retry config |
| `src/lib/sentry.ts` | Sentry init + privacy |
| `src/components/ErrorToast.tsx` | Global error toasts |
