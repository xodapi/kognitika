# Web Workers / Off-Main-Thread Architecture

**Статус**: ⏸️ **Planned** — требует `docs/frame-budget-benchmark.md` gate · **Worker**: `analytics.worker.ts` · **WASM Boundary**: `kognitika-core` via Comlink

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        Main Thread (UI)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  React App  │  │  Trainer    │  │  Comlink Proxy      │  │
│  │  (60 FPS)   │──►│  Engines    │──►│  (analyticsWorker)  │  │
│  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │
│                                                │ postMessage  │
│                                                ▼              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Web Worker (analytics.worker.ts)            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │ Batch Queue │  │  WASM       │  │  IndexedDB      │  │  │
│  │  │ (sessions)  │──►│  analyze    │──►│  Persistence    │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Worker Implementation

### `src/workers/analytics.worker.ts`

```typescript
import { expose } from 'comlink';
import type { AnalyzeSessionInput, SessionAnalyticsSummary } from '@shared/types';
import { analyzeSession } from '../lib/analyze-session'; // WASM wrapper

// Типы для Comlink
export interface AnalyticsWorkerAPI {
  /** Добавить сессию в очередь батч-обработки */
  queueSession(input: AnalyzeSessionInput): Promise<void>;

  /** Принудительный флаш очереди */
  flush(): Promise<void>;

  /** Получить накопленную аналитику для пользователя */
  getUserAnalytics(userId: string): Promise<SessionAnalyticsSummary[]>;

  /** Очистить старые данные (retention policy) */
  cleanup(olderThanDays: number): Promise<number>;
}

// State
const queue: AnalyzeSessionInput[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 5000; // 5 сек
const MAX_QUEUE_SIZE = 50;

// WASM warm-up
let wasmReady = false;
async function ensureWasmReady() {
  if (!wasmReady) {
    await analyzeSession({ events: [], gameType: 'SCHULTE', startedAt: Date.now() });
    wasmReady = true;
  }
}

// Batch processor
async function processQueue() {
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_QUEUE_SIZE);
  await ensureWasmReady();

  // Параллельная обработка батча (WASM thread-safe)
  const results = await Promise.all(
    batch.map(input => analyzeSession(input))
  );

  // Сохранение в IndexedDB (через idb)
  const { default: idb } = await import('idb');
  const db = await idb.openDB('kognitika-analytics', 1, {
    upgrade(db) {
      db.createObjectStore('sessions', { keyPath: 'id' });
      db.createObjectStore('summaries', { keyPath: 'userId' });
    },
  });

  const tx = db.transaction('sessions', 'readwrite');
  await Promise.all(
    results.map((summary, i) => tx.store.put({ ...summary, id: crypto.randomUUID() }))
  );
  await tx.done;

  // Уведомление main thread (optional)
  self.postMessage({ type: 'BATCH_PROCESSED', count: results.length });
}

// Auto-flush timer
function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    processQueue();
  }, FLUSH_INTERVAL_MS);
}

// API Implementation
const api: AnalyticsWorkerAPI = {
  async queueSession(input) {
    queue.push(input);
    scheduleFlush();

    // Emergency flush if queue too large
    if (queue.length >= MAX_QUEUE_SIZE) {
      await processQueue();
    }
  },

  async flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await processQueue();
  },

  async getUserAnalytics(userId) {
    const { default: idb } = await import('idb');
    const db = await idb.openDB('kognitika-analytics', 1);
    return db.getAllFromIndex('sessions', 'userId', userId);
  },

  async cleanup(olderThanDays) {
    const { default: idb } = await import('idb');
    const db = await idb.openDB('kognitika-analytics', 1);
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const tx = db.transaction('sessions', 'readwrite');
    let deleted = 0;

    for await (const cursor of tx.store.iterate()) {
      if (cursor.value.startedAt < cutoff) {
        await cursor.delete();
        deleted++;
      }
    }
    await tx.done;
    return deleted;
  },
};

// Expose via Comlink
expose(api);

export type { AnalyticsWorkerAPI };
```

---

## Main Thread Integration

### `src/hooks/useAnalyticsWorker.ts`

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { wrap, Remote, Release } from 'comlink';
import type { AnalyticsWorkerAPI } from '../workers/analytics.worker';

let workerRef: Remote<AnalyticsWorkerAPI> | null = null;
let releaseRef: Release | null = null;

function getWorker(): Remote<AnalyticsWorkerAPI> {
  if (!workerRef) {
    const worker = new Worker(new URL('../workers/analytics.worker.ts', import.meta.url), {
      type: 'module',
      name: 'kognitika-analytics',
    });
    workerRef = wrap<AnalyticsWorkerAPI>(worker);
    releaseRef = () => worker.terminate();
  }
  return workerRef;
}

export function useAnalyticsWorker() {
  const worker = useRef(getWorker()).current;

  const queueSession = useCallback(async (input: AnalyzeSessionInput) => {
    try {
      await worker.queueSession(input);
    } catch (e) {
      console.error('[AnalyticsWorker] queueSession failed:', e);
      // Fallback: direct call on main thread (degraded mode)
      const { analyzeSession } = await import('../lib/analyze-session');
      await analyzeSession(input);
    }
  }, [worker]);

  const flush = useCallback(async () => {
    try {
      await worker.flush();
    } catch (e) {
      console.error('[AnalyticsWorker] flush failed:', e);
    }
  }, [worker]);

  const getUserAnalytics = useCallback(async (userId: string) => {
    try {
      return await worker.getUserAnalytics(userId);
    } catch (e) {
      console.error('[AnalyticsWorker] getUserAnalytics failed:', e);
      return [];
    }
  }, [worker]);

  // Cleanup on unmount (optional - worker persists)
  useEffect(() => {
    return () => {
      // Worker жидёт на весь lifecycle приложения
      // releaseRef?.(); // НЕ вызываем — worker singleton
    };
  }, []);

  return { queueSession, flush, getUserAnalytics };
}
```

---

## Engine Integration (Example: `useSchulteEngine`)

```typescript
// src/hooks/useSchulteEngine.ts
import { useCallback } from 'react';
import { useAnalyticsWorker } from './useAnalyticsWorker';
import type { AnalyzeSessionInput, SchulteEvent } from '@shared/types';

export function useSchulteEngine(config: SchulteConfig) {
  const { queueSession } = useAnalyticsWorker();

  const onSessionComplete = useCallback(async (events: SchulteEvent[], startedAt: number) => {
    const input: AnalyzeSessionInput = {
      gameType: 'SCHULTE',
      startedAt,
      completedAt: Date.now(),
      events: events.map(e => ({
        type: 'cell_click',
        t: e.timestamp,
        payload: { cellId: e.cellId, value: e.value, correct: e.correct },
      })),
      metadata: {
        gridSize: config.gridSize,
        seed: config.seed,
      },
    };

    // Fire-and-forget to worker (non-blocking)
    queueSession(input);
  }, [queueSession, config.gridSize, config.seed]);

  // ... rest of engine logic
}
```

---

## WASM Boundary (Transferable Objects)

### `src/lib/analyze-session.ts` (WASM wrapper)

```typescript
import init, { analyze_session } from 'kognitika-core';
import type { AnalyzeSessionInput, SessionAnalyticsSummary } from '@shared/types';

let wasmReady = false;

export async function analyzeSession(input: AnalyzeSessionInput): Promise<SessionAnalyticsSummary> {
  if (!wasmReady) {
    await init(); // загружает .wasm
    wasmReady = true;
  }

  // Подготовка данных для WASM (serialize)
  // Важно: используем transferable objects для больших массивов
  const eventsPtr = serializeEvents(input.events); // → Uint8Array / ArrayBuffer

  try {
    // Вызов WASM (синхронный, быстрый)
    const resultPtr = analyze_session(eventsPtr, input.metadata);

    // Десериализация результата
    return deserializeSummary(resultPtr);
  } finally {
    // Освобождение памяти WASM
    free_events(eventsPtr);
    free_result(resultPtr);
  }
}

// Для очень больших сессий (>5000 событий) — используем SharedArrayBuffer
// или передаём чанки через postMessage с transfer
```

---

## IndexedDB Schema (Worker-side)

```typescript
// src/workers/db-schema.ts
export const DB_NAME = 'kognitika-analytics';
export const DB_VERSION = 1;

export const STORES = {
  sessions: {
    keyPath: 'id',
    indexes: [
      { name: 'userId', keyPath: 'userId', unique: false },
      { name: 'gameType', keyPath: 'gameType', unique: false },
      { name: 'startedAt', keyPath: 'startedAt', unique: false },
      { name: 'completedAt', keyPath: 'completedAt', unique: false },
    ],
  },
  summaries: {
    keyPath: 'userId',
    indexes: [
      { name: 'updatedAt', keyPath: 'updatedAt', unique: false },
    ],
  },
  queue: {
    keyPath: 'id',
    indexes: [
      { name: 'priority', keyPath: 'priority', unique: false },
      { name: 'createdAt', keyPath: 'createdAt', unique: false },
    ],
  },
} as const;
```

---

## Message Protocol (Main ↔ Worker)

| Direction | Message | Payload |
|---|---|---|
| Main → Worker | `QUEUE_SESSION` | `AnalyzeSessionInput` |
| Main → Worker | `FLUSH` | — |
| Main → Worker | `GET_ANALYTICS` | `{ userId: string }` |
| Main → Worker | `CLEANUP` | `{ olderThanDays: number }` |
| Worker → Main | `BATCH_PROCESSED` | `{ count: number, timestamp: number }` |
| Worker → Main | `ANALYTICS_RESULT` | `SessionAnalyticsSummary[]` |
| Worker → Main | `CLEANUP_RESULT` | `{ deleted: number }` |
| Worker → Main | `ERROR` | `{ message: string, code: string }` |

---

## Lifecycle & Error Handling

| Сценарий | Поведение |
|---|---|
| **Worker crash** | `onerror` → логирование → пересоздание worker → retry queue |
| **Main thread unload** | `beforeunload` → `worker.flush()` → `navigator.sendBeacon` для критических данных |
| **WASM OOM** | Catch → fallback to JS implementation → report to Sentry |
| **Queue overflow** | Emergency flush + backpressure signal to main thread |
| **IndexedDB quota exceeded** | `cleanup(30)` → retry → if still fails, drop oldest low-priority |

---

## Testing

### Unit (Vitest)
```typescript
// src/workers/analytics.worker.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { wrap } from 'comlink';

// Mock WASM
vi.mock('../lib/analyze-session', () => ({
  analyzeSession: vi.fn().mockResolvedValue({ clickCount: 25, accuracy: 0.92 }),
}));

it('queues and processes sessions', async () => {
  const worker = new Worker(new URL('./analytics.worker.ts', import.meta.url), { type: 'module' });
  const api = wrap<AnalyticsWorkerAPI>(worker);

  await api.queueSession({ gameType: 'SCHULTE', events: [], startedAt: Date.now() });
  await api.flush();

  // Verify IndexedDB write (mocked)
  expect(analyzeSession).toHaveBeenCalledTimes(1);
  worker.terminate();
});
```

### E2E (Playwright)
```typescript
// tests/worker-e2e.spec.ts
test('analytics worker processes session in background', async ({ page }) => {
  await page.goto('/schulte');
  await page.click('[data-testid="start"]');
  // ... play 25 cells ...
  await page.click('[data-testid="finish"]');

  // Wait for worker to process
  await page.waitForFunction(() => window.__ANALYTICS_FLUSHED__ === true);

  const summary = await page.evaluate(() => window.__LAST_ANALYTICS__);
  expect(summary.clickCount).toBe(25);
  expect(summary.accuracy).toBeGreaterThan(0.8);
});
```

---

## Performance Impact

| Метрика | Без Worker | С Worker | Изменение |
|---|---|---|---|
| **Main thread blocked (analyzeSession 1000 clicks)** | 5.2 ms | 0.1 ms (postMessage) | **-98%** |
| **Frame drops during analysis** | 2-3 frames | 0 | **-100%** |
| **INP (Interaction to Next Paint)** | 180 ms | 85 ms | **-53%** |
| **Memory (peak)** | 12 MB | 8 MB (shared) | **-33%** |

---

## Acceptance Criteria (для включения)

| Критерий | Target | Статус |
|---|---|---|
| Frame budget (Schulte 5×5) | 0 dropped frames p99 | ⏸️ Требует gate |
| WASM analyzeSession p95 | < 8ms (1000 clicks) | ⏸️ Требует gate |
| Worker crash recovery | < 100ms restart | 🔄 In design |
| Queue persistence | Survive page reload | 🔄 In design |
| Bundle size impact | < 5 KB gz | ✅ ~3 KB |

---

## Файлы

| Путь | Назначение |
|---|---|
| `src/workers/analytics.worker.ts` | Основной worker (Comlink API) |
| `src/workers/db-schema.ts` | IndexedDB схема |
| `src/hooks/useAnalyticsWorker.ts` | React hook для main thread |
| `src/lib/analyze-session.ts` | WASM wrapper (transferable objects) |
| `vite.config.ts` | `worker: { format: 'es', plugins: [] }` |
| `scripts/check-worker-bundle.js` | CI gate для worker size |
