# Bundle Analyzer & Size Monitoring

**Инструменты**: `vite-bundle-analyzer`, `rollup-plugin-visualizer`, `webpack-bundle-analyzer` (legacy) · **CI Gate**: `pnpm build:analyze` · **Бюджет**: Initial JS ≤ 120 KB gz

---

## Зачем нужно

| Проблема | Как ловит Bundle Analyzer |
|---|---|
| **Dead code** | Неиспользуемые экспорты, мёртвые ветки |
| **Heavy deps** | `lodash`, `moment`, `date-fns` (вместо нативных), `recharts` (вместо легких альтернатив) |
| **Duplicate deps** | Две версии одной либы (React, Zod, etc.) |
| **Missing code splitting** | Всё в `vendor` chunk, нет lazy routes |
| **WASM size** | `.wasm` в initial bundle вместо streamed |

---

## Конфигурация

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { analyzer } from 'vite-bundle-analyzer';

export default defineConfig({
  plugins: [
    // Visualizer (HTML report)
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // treemap | sunburst | network
    }),

    // Analyzer (JSON for CI)
    process.env.ANALYZE && analyzer({
      analyzerMode: 'json',
      reportFilename: 'dist/bundle-analysis.json',
      defaultSizes: 'gzip',
    }),
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom', 'react-router-dom'],
          motion: ['motion'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
          charts: ['recharts'],
          utils: ['date-fns', 'zod', 'clsx', 'tailwind-merge'],
          trainers: ['@/hooks/useSchulteEngine', '@/hooks/useNBackEngine', '@/hooks/useStroopEngine'],
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

## Команды

```bash
# Локальный анализ (HTML)
ANALYZE=true pnpm build
# Открывает dist/stats.html в браузере

# CI режим (JSON)
pnpm build:analyze
# Генерирует dist/bundle-analysis.json

# Только visualizer
pnpm build && npx vite-bundle-analyzer dist/stats.html
```

### `package.json` scripts

```json
{
  "scripts": {
    "build": "vite build",
    "build:analyze": "ANALYZE=true vite build --mode analyze",
    "analyze:visualize": "vite-bundle-analyzer dist/stats.html",
    "analyze:ci": "node scripts/check-bundle-budget.js dist/bundle-analysis.json"
  }
}
```

---

## CI Budget Checker

### `scripts/check-bundle-budget.js`

```javascript
const fs = require('fs');
const path = require('path');

const BUDGETS = {
  // Initial load (critical)
  initial: {
    maxGzippedKB: 120,
    chunks: ['vendor', 'motion', 'ui'],
  },
  // Per-chunk limits
  chunks: {
    vendor: 80,
    motion: 25,
    ui: 30,
    charts: 40,
    utils: 20,
    trainers: 35,
    // Lazy routes
    'schulte-page': 25,
    'stroop-page': 30,
    'nback-page': 28,
    'duels-page': 35,
    'profile-page': 22,
    'admin-page': 40,
  },
  // WASM
  wasm: {
    maxGzippedKB: 180,
  },
};

function checkBudget(analysis) {
  let failed = false;
  const warnings = [];

  // Check initial chunks
  const initialChunks = analysis.chunks.filter(c => BUDGETS.initial.chunks.includes(c.name));
  const initialSize = initialChunks.reduce((sum, c) => sum + c.gzippedSize, 0);
  const initialKB = initialSize / 1024;

  if (initialKB > BUDGETS.initial.maxGzippedKB) {
    console.error(`❌ INITIAL BUNDLE: ${initialKB.toFixed(1)}KB > ${BUDGETS.initial.maxGzippedKB}KB`);
    failed = true;
  } else {
    console.log(`✅ Initial: ${initialKB.toFixed(1)}KB / ${BUDGETS.initial.maxGzippedKB}KB`);
  }

  // Check per-chunk
  for (const chunk of analysis.chunks) {
    const budget = BUDGETS.chunks[chunk.name];
    if (!budget) continue;

    const kb = chunk.gzippedSize / 1024;
    if (kb > budget) {
      console.error(`❌ CHUNK "${chunk.name}": ${kb.toFixed(1)}KB > ${budget}KB`);
      failed = true;
    } else if (kb > budget * 0.8) {
      warnings.push(`⚠️ CHUNK "${chunk.name}": ${kb.toFixed(1)}KB (${((kb/budget)*100).toFixed(0)}% of budget)`);
    } else {
      console.log(`✅ ${chunk.name}: ${kb.toFixed(1)}KB / ${budget}KB`);
    }
  }

  // Check WASM
  const wasmChunk = analysis.chunks.find(c => c.name.endsWith('.wasm'));
  if (wasmChunk) {
    const kb = wasmChunk.gzippedSize / 1024;
    if (kb > BUDGETS.wasm.maxGzippedKB) {
      console.error(`❌ WASM: ${kb.toFixed(1)}KB > ${BUDGETS.wasm.maxGzippedKB}KB`);
      failed = true;
    } else {
      console.log(`✅ WASM: ${kb.toFixed(1)}KB / ${BUDGETS.wasm.maxGzippedKB}KB`);
    }
  }

  // Warnings
  for (const w of warnings) console.warn(w);

  // Duplicates check
  const modulesByName = new Map();
  for (const chunk of analysis.chunks) {
    for (const mod of chunk.modules) {
      const name = mod.name.split('/').slice(0, 2).join('/'); // pkg scope
      if (!modulesByName.has(name)) modulesByName.set(name, new Set());
      modulesByName.get(name).add(chunk.name);
    }
  }

  for (const [name, chunks] of modulesByName) {
    if (chunks.size > 1) {
      console.warn(`⚠️ DUPLICATE: "${name}" in chunks: ${[...chunks].join(', ')}`);
    }
  }

  if (failed) {
    console.error('\n🚨 BUDGET EXCEEDED - Fix before merge');
    process.exit(1);
  }

  console.log('\n✅ All budgets passed');
}

const file = process.argv[2] || 'dist/bundle-analysis.json';
const analysis = JSON.parse(fs.readFileSync(file, 'utf8'));
checkBudget(analysis);
```

---

## Visualizer Report (HTML)

### Treemap (default)

```
┌─────────────────────────────────────────────────────────────┐
│  vendor (85 KB gz)                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ react (32)   │  │ react-dom (28)│  │ react-router (12)  │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  motion (18 KB)                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ motion (18)                                           │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  charts (38 KB)  ← WARNING: near budget                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ recharts (35)│  │ d3-scale (3) │  │ d3-shape (2)       │ │
│  └──────────────┘  └──────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Sunburst (alternative)

```bash
# В visualizer config
template: 'sunburst',
```

---

## Common Optimizations

### 1. Replace Heavy Deps

| Heavy | Light Alternative | Savings |
|---|---|---|
| `moment` (67 KB) | `date-fns` (15 KB) / native `Intl` | ~50 KB |
| `lodash` (71 KB) | `es-toolkit` (3 KB) / native | ~65 KB |
| `recharts` (140 KB) | `uplot` (25 KB) / `chart.js` (60 KB) | ~80 KB |
| `date-fns` (full) | `date-fns/fp` + tree-shaking | ~50% |
| `zod` (55 KB) | `valibot` (8 KB) / `arktype` | ~45 KB |

### 2. Code Splitting

```tsx
// Lazy routes
const SchultePage = lazy(() => import('@/pages/SchultePage').then(m => ({ default: m.SchultePage })));
const DuelsPage = lazy(() => import('@/pages/DuelsPage').then(m => ({ default: m.DuelsPage })));

// Suspense boundary
<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/schulte" element={<SchultePage />} />
    <Route path="/duels" element={<DuelsPage />} />
  </Routes>
</Suspense>
```

### 3. Dynamic Imports for Heavy Features

```tsx
// Heavy: Export to LLM
const exportToLLM = async (data) => {
  const { generateLLMPrompt } = await import('@/lib/llm-export');
  return generateLLMPrompt(data);
};

// Heavy: WASM Analytics
const analyzeSession = async (input) => {
  const { analyzeSession } = await import('@/lib/analyze-session-wasm');
  return analyzeSession(input);
};
```

### 4. Tree-shaking Friendly Imports

```typescript
// ❌ Bad - imports all
import * as _ from 'lodash';
import { format } from 'date-fns';

// ✅ Good - specific imports
import { debounce } from 'es-toolkit/compat';
import { format } from 'date-fns/format';
import { addDays } from 'date-fns/addDays';
```

### 5. WASM Streaming

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2022',
    // WASM as separate chunk, streamed
    rollupOptions: {
      output: {
        manualChunks: undefined, // Let Vite handle WASM
      },
    },
  },
});

// Load WASM async
const wasmModule = await import('kognitika-core/wasm').then(m => m.default());
```

---

## Monitoring in CI

### GitHub Actions

```yaml
# .github/workflows/bundle.yml
name: Bundle Size
on:
  pull_request:
    branches: [main]

jobs:
  bundle:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:analyze
      - run: pnpm analyze:ci
      - name: Comment PR with bundle size
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const analysis = JSON.parse(fs.readFileSync('dist/bundle-analysis.json'));
            const initial = analysis.chunks.filter(c => ['vendor','motion','ui'].includes(c.name))
              .reduce((s, c) => s + c.gzippedSize, 0) / 1024;
            const body = `## 📦 Bundle Size Report\n\nInitial JS: **${initial.toFixed(1)} KB gz** (budget: 120 KB)\n\n| Chunk | Size (gz) |\n|-------|-----------|\n${analysis.chunks.map(c => `| ${c.name} | ${(c.gzippedSize/1024).toFixed(1)} KB |`).join('\n')}`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            });
```

### PR Comment Example

```
## 📦 Bundle Size Report

Initial JS: **98.3 KB gz** (budget: 120 KB)

| Chunk | Size (gz) |
|-------|-----------|
| vendor | 62.1 KB |
| motion | 18.4 KB |
| ui | 24.7 KB |
| charts | 35.2 KB |
| utils | 12.8 KB |
| trainers | 28.9 KB |
| schulte-page | 15.3 KB |
| duels-page | 22.1 KB |
| wasm | 142.5 KB |
```

---

## Historical Tracking

### Grafana Dashboard (Prometheus)

```promql
# Bundle size over time
kognitika_bundle_size_kb{branch="main", chunk="initial"}

# Per chunk
kognitika_bundle_size_kb{branch="main"} by (chunk)

# Alert: size increase > 10%
increase(kognitika_bundle_size_kb[7d]) / kognitika_bundle_size_kb offset 7d > 0.1
```

### Simple JSON History

```bash
# After each deploy to main
curl -X POST https://api.example.com/bundle-history \
  -H "Authorization: Bearer $TOKEN" \
  -d @dist/bundle-analysis.json \
  -H "Content-Type: application/json"
```

---

## Troubleshooting

| Симптом | Диагностика | Лечение |
|---|---|---|
| `chunkSizeWarningLimit` | `pnpm build` показывает warning | Проверить `manualChunks`, добавить lazy |
| WASM в initial | `stats.html` показывает `.wasm` в vendor | `build.target: 'es2022'`, проверить `import` |
| Дубликаты | `check-bundle-budget.js` warns | `pnpm dedupe`, `resolutions` в package.json |
| Рост после PR | PR comment показывает +20 KB | `git diff main --stat`, найти новый import |
| `recharts` слишком большой | Анализ `node_modules/recharts` | Заменить на `uplot` или lazy load |

---

## Файлы

| Путь | Назначение |
|---|---|
| `vite.config.ts` | Chunk splitting, visualizer, analyzer plugins |
| `scripts/check-bundle-budget.js` | CI gate script |
| `.github/workflows/bundle.yml` | PR bundle size comment |
| `dist/stats.html` | Local visualizer (treemap/sunburst) |
| `dist/bundle-analysis.json` | Machine-readable for CI |
| `monitoring/grafana/dashboards/bundle.json` | Historical dashboard |
