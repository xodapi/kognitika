# Бюджет производительности (Performance Budget)

**Цель**: 60 FPS (16.67 ms/frame) на всех тренажёрах · **CI Gate**: `pnpm perf:budget` · **Docs**: `docs/frame-budget-benchmark.md`

---

## Frame Budget (16.67 ms / frame)

| Фаза | Бюджет | Комментарий |
|---|---|---|
| **JS Execution** | ≤ 8 ms | React render, hooks, logic |
| **Style / Layout** | ≤ 4 ms | Reflow, paint, composite |
| **GPU / Compositing** | ≤ 2 ms | Motion animations, transforms |
| **Idle / Margin** | ~2.67 ms | GC, браузерные задачи, запас |

**Сумма**: ≤ 16.67 ms → 60 FPS

---

## Critical User Journeys (CUJ)

| Сценарий | Путь | Целевой FPS | Метрика успеха |
|---|---|---|---|
| **Schulte 5×5** | Settings → Start → 25 clicks → Results | 60 FPS | 0 dropped frames, p99 click→render < 16ms |
| **Stroop 60s** | Pre-Luscher → Stroop → Post-Luscher | 60 FPS | Color switch < 8ms, timer smooth |
| **N-Back 20 rounds** | 2-back → d-prime calc → Save | 60 FPS | Stimulus presentation < 10ms |
| **Duel Matchmaking** | Create → Wait → Join → Play | 60 FPS | Socket latency p95 < 100ms |
| **Daily Practice** | Dashboard → 3 tasks → Complete | 60 FPS | Task switch < 50ms |
| **Export → LLM** | Profile → Export JSON → Copy | 30 FPS | JSON serialize < 200ms |

---

## Bundle Budgets

| Чанк | Лимит (gzipped) | Текущий | CI Check |
|---|---|---|---|
| **Initial (vendor + app)** | ≤ 120 KB | ~95 KB | ✅ |
| **Router (lazy routes)** | ≤ 30 KB/route | ~18 KB | ✅ |
| **Trainer modules (lazy)** | ≤ 25 KB | ~15 KB | ✅ |
| **WASM (kognitika-core)** | ≤ 180 KB | ~145 KB | ✅ |
| **Total JS (initial)** | ≤ 150 KB | ~113 KB | ✅ |
| **CSS** | ≤ 15 KB | ~11 KB | ✅ |

### Vite Config (Budget Enforcement)

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'motion'],
          ui: ['@radix-ui/*', 'lucide-react'],
          charts: ['recharts'],
          utils: ['date-fns', 'zod', 'clsx'],
        },
      },
    },
    chunkSizeWarningLimit: 120, // KB
    cssCodeSplit: true,
    minify: 'esbuild',
    reportCompressedSize: true,
  },
});
```

---

## Runtime Performance Targets

### Core Web Vitals (Production)

| Метрика | Target | P75 | P95 |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | 1.8s | 2.8s |
| **INP** (Interaction to Next Paint) | ≤ 200ms | 85ms | 180ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.02 | 0.05 |
| **TTFB** | ≤ 800ms | 200ms | 600ms |
| **FCP** | ≤ 1.8s | 1.1s | 1.6s |

### Trainer-Specific Metrics

| Тренажёр | Критический путь | Бюджет |
|---|---|---|
| **Schulte** | Cell click → render next | ≤ 8ms |
| **Stroop** | Color change → button enable | ≤ 6ms |
| **N-Back** | Stimulus show → response window | ≤ 10ms |
| **Mental Math** | Keystroke → validation | ≤ 4ms |
| **Typing** | Keydown → char appear | ≤ 3ms |
| **Duel** | Opponent move → local render | ≤ 50ms (network + render) |

---

## WASM Budget (`kognitika-core`)

| Операция | Input size | Target (p95) | Current |
|---|---|---|---|
| **analyzeSession** | 100 clicks | ≤ 2ms | 1.3ms |
| **analyzeSession** | 1000 clicks | ≤ 8ms | 5.2ms |
| **analyzeSession** | 10000 clicks | ≤ 50ms | 38ms |
| **Memory** | Peak heap | ≤ 10 MB | 6.8 MB |
| **Instantiate** | Cold start | ≤ 5ms | 3.1ms |

### Benchmark Script

```bash
# Запуск бенчмарка WASM
pnpm bench:wasm

# Вывод (JSON для CI)
{
  "analyzeSession": {
    "100_clicks": { "p50": 1.1, "p95": 1.3, "p99": 1.5 },
    "1000_clicks": { "p50": 4.8, "p95": 5.2, "p99": 5.8 },
    "10000_clicks": { "p50": 35, "p95": 38, "p99": 42 }
  },
  "memory": { "peak_mb": 6.8 },
  "instantiate_ms": 3.1
}
```

---

## CI Performance Gates

### `.github/workflows/perf.yml`

```yaml
name: Performance Budget
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  bundle-budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Check bundle sizes
        run: |
          npx vite-bundle-analyzer --json > bundle-report.json
          node scripts/check-bundle-budget.js bundle-report.json

  wasm-benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm bench:wasm --json > wasm-bench.json
      - name: Check WASM budget
        run: node scripts/check-wasm-budget.js wasm-bench.json

  lighthouse-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm preview --port 4173 &
      - run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### Bundle Budget Checker (`scripts/check-bundle-budget.js`)

```javascript
const fs = require('fs');
const BUDGETS = {
  'initial': 120 * 1024,      // 120 KB
  'vendor': 80 * 1024,
  'router': 30 * 1024,
  'trainer': 25 * 1024,
  'wasm': 180 * 1024,
};

const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let failed = false;

for (const chunk of report.chunks) {
  const budget = BUDGETS[chunk.category] || BUDGETS.initial;
  const gzipped = chunk.gzippedSize || chunk.size * 0.3; // estimate
  if (gzipped > budget) {
    console.error(`❌ ${chunk.name}: ${(gzipped/1024).toFixed(1)}KB > ${(budget/1024).toFixed(1)}KB`);
    failed = true;
  } else {
    console.log(`✅ ${chunk.name}: ${(gzipped/1024).toFixed(1)}KB / ${(budget/1024).toFixed(1)}KB`);
  }
}

if (failed) {
  console.error('\n🚨 Bundle budget exceeded!');
  process.exit(1);
}
console.log('\n✅ All bundle budgets passed');
```

### WASM Budget Checker (`scripts/check-wasm-budget.js`)

```javascript
const fs = require('fs');
const BUDGETS = {
  '100_clicks_p95': 2,
  '1000_clicks_p95': 8,
  '10000_clicks_p95': 50,
  'memory_peak_mb': 10,
  'instantiate_ms': 5,
};

const bench = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let failed = false;

const checks = [
  { key: '100_clicks_p95', value: bench.analyzeSession['100_clicks'].p95 },
  { key: '1000_clicks_p95', value: bench.analyzeSession['1000_clicks'].p95 },
  { key: '10000_clicks_p95', value: bench.analyzeSession['10000_clicks'].p95 },
  { key: 'memory_peak_mb', value: bench.memory.peak_mb },
  { key: 'instantiate_ms', value: bench.instantiate_ms },
];

for (const { key, value } of checks) {
  const budget = BUDGETS[key];
  if (value > budget) {
    console.error(`❌ ${key}: ${value} > ${budget}`);
    failed = true;
  } else {
    console.log(`✅ ${key}: ${value} ≤ ${budget}`);
  }
}

if (failed) process.exit(1);
```

---

## Profiling Tools

### Local Development

```bash
# 1. Vite Bundle Analyzer
pnpm build && npx vite-bundle-analyzer dist

# 2. Chrome DevTools Performance
# - Record during Schulte 5x5 session
# - Check: Main thread, GPU, Memory

# 3. React DevTools Profiler
# - Record why components re-render
# - Filter: "Record why each component rendered"

# 4. WASM profiling (Chrome)
# - DevTools → Memory → WASM heap snapshots
# - DevTools → Performance → WASM functions

# 4. Bundle stats JSON
pnpm build -- --json > bundle-stats.json
```

### Automated (CI)

| Tool | Что измеряет | Артефакт |
|---|---|---|
| `vite-bundle-analyzer` | Chunk sizes, dependencies | `bundle-report.json` |
| `lighthouse-ci` | CWV, accessibility, SEO | `lhci-report.html` |
| `playwright --trace` | E2E frame timing | `trace.zip` |
| Custom bench | WASM, session analysis | `wasm-bench.json` |

---

## Regression Detection

| Правило | Порог | Действие |
|---|---|---|
| Bundle size increase | > 5% от предыдущего main | Fail CI, требует PR с обоснованием |
| WASM p95 increase | > 10% | Fail CI |
| LCP increase | > 200ms | Warn |
| INP increase | > 50ms | Warn |
| New dropped frames в E2E | > 0 | Fail CI |

---

## Optimization Checklist (по приоритету)

| Приоритет | Оптимизация | Статус |
|---|---|---|
| **P0** | Lazy-load trainer modules (`React.lazy` + `Suspense`) | ✅ |
| **P0** | WASM для `analyzeSession` (Rust → WASM) | ✅ |
| **P0** | Virtualized lists (Leaderboard, Sessions history) | ✅ |
| **P1** | `useMemo` / `useCallback` для тяжёлых вычислений | ✅ |
| **P1** | Debounce resize/scroll handlers | ✅ |
| **P1** | CSS `contain: layout paint` на игровых зонах | ✅ |
| **P2** | `will-change` для анимированных элементов | 🔄 |
| **P2** | Service Worker + stale-while-revalidate | ⏸️ (PWA gate) |
| **P2** | Preload critical chunks (`modulepreload`) | 🔄 |
| **P3** | Web Workers для analytics batch | ⏸️ (Workers gate) |
| **P3** | OffscreenCanvas для шульте-грида | 🔬 R&D |

---

## Мониторинг в Production

### Real User Monitoring (RUM) — веб-виталии

```typescript
// src/lib/rum.ts
export function initRUM() {
  if (!('PerformanceObserver' in window)) return;

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'largest-contentful-paint') {
        sendMetric('LCP', entry.startTime);
      }
      if (entry.entryType === 'first-input') {
        sendMetric('FID', entry.processingStart - entry.startTime);
      }
      if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
        sendMetric('CLS', entry.value);
      }
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  // INP (via Event Timing API)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'event') {
        sendMetric('INP', entry.duration);
      }
    }
  }).observe({ type: 'event', buffered: true });
}
```

### Dashboards (Grafana / Sentry)

| Дашборд | Метрики | Alert |
|---|---|---|
| **Web Vitals** | LCP, INP, CLS, TTFB (p50/p75/p95) | LCP p75 > 2.5s |
| **JS Errors** | Count, affected users, top errors | Error rate > 1% |
| **Bundle** | Initial JS, CSS, WASM sizes | Initial JS > 150KB |
| **Trainers** | FPS (custom), frame drops | Avg FPS < 55 |
| **Duel** | Matchmaking latency, socket reconnects | p95 latency > 200ms |

---

## Acceptance Gates (для снятия паузы Mobile/WASM/PWA)

| Gate | Документ | Критерии прохождения |
|---|---|---|
| **Frame Budget** | `docs/frame-budget-benchmark.md` | Все CUJ: 60 FPS, 0 dropped frames p99 |
| **WASM Hot-path** | `docs/wasm-hotpath-benchmark.md` | `analyzeSession` 1000 clicks p95 < 8ms |
| **PWA/Offline** | `docs/pwa-offline-strategy.md` | SW caches app shell, IndexedDB sync, conflict resolution |
| **Bundle** | `vite.config.ts` + CI | Initial JS ≤ 120KB gz, Total ≤ 200KB |
| **Memory** | Chrome DevTools | No leaks в 30-min session, peak < 50MB |

---

## Файлы и скрипты

| Путь | Назначение |
|---|---|
| `vite.config.ts` | Chunk splitting, bundle limits |
| `scripts/check-bundle-budget.js` | CI gate для bundle size |
| `scripts/check-wasm-budget.js` | CI gate для WASM perf |
| `.github/workflows/perf.yml` | Performance CI pipeline |
| `src/lib/rum.ts` | Real User Monitoring |
| `crates/kognitika-core/benches/` | Rust criterion benches |
| `docs/frame-budget-benchmark.md` | Детальный бенчмарк протокол |
