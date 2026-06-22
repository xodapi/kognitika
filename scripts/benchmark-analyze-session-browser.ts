import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import {
  analyzeSession,
  syntheticCellClickSession,
  syntheticPracticeFlowSession,
  syntheticSuspiciousFastSession,
} from '../src/core/analyze-session';

interface BenchmarkStats {
  totalMs: number;
  perSessionMs: number;
  sessionsPerSecond: number;
}

interface FrameBudgetStats {
  frameCount: number;
  maxFrameDeltaMs: number;
  p95FrameDeltaMs: number;
  p99FrameDeltaMs: number;
  droppedFrames: number;
  longTaskCount: number;
  maxLongTaskMs: number;
  passesSmokeBudget: boolean;
}

interface BrowserBenchmarkResult {
  generatedAt: string;
  iterations: number;
  fixtureCount: number;
  sessionCount: number;
  tsMainThread: BenchmarkStats & { frameBudget: FrameBudgetStats };
  wasmWorker: BenchmarkStats & {
    initMs: number;
    parityOk: boolean;
    frameBudget: FrameBudgetStats;
  };
  wasmAssets: {
    jsBytes: number;
    wasmBytes: number;
    totalBytes: number;
  };
  decision: string;
}

const iterations = Number(process.env.ANALYZE_SESSION_BROWSER_BENCH_ITERATIONS || 3_000);
const rootDir = resolve(import.meta.dirname, '..');
const crateDir = join(rootDir, 'crates', 'kognitika-core');
const wasmOutDir = join(rootDir, 'scratch', 'kognitika-core-wasm-web');
const benchmarkDir = join(rootDir, 'scratch', 'analyze-session-browser-benchmark');
const benchmarkHtmlPath = join(benchmarkDir, 'index.html');
const benchmarkScriptPath = join(benchmarkDir, 'browser-benchmark.ts');
const benchmarkPort = Number(process.env.ANALYZE_SESSION_BROWSER_BENCH_PORT || 4308);

const fixtures = [
  syntheticCellClickSession,
  syntheticPracticeFlowSession,
  syntheticSuspiciousFastSession,
] as const;
const expectedJson = fixtures.map((fixture) => JSON.stringify(analyzeSession(fixture)));

function round(value: number, digits = 4) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function buildWasmPackage() {
  mkdirSync(wasmOutDir, { recursive: true });
  execFileSync('wasm-pack', [
    'build',
    crateDir,
    '--target',
    'web',
    '--out-dir',
    wasmOutDir,
    '--release',
  ], {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

function writeBenchmarkPage() {
  mkdirSync(benchmarkDir, { recursive: true });
  writeFileSync(
    benchmarkHtmlPath,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>AnalyzeSession Browser Worker Benchmark</title>
  </head>
  <body>
    <main id="root">AnalyzeSession browser benchmark</main>
    <script type="module" src="./browser-benchmark.ts"></script>
  </body>
</html>
`,
    'utf8',
  );

  writeFileSync(
    benchmarkScriptPath,
    `import {
  analyzeSession,
  syntheticCellClickSession,
  syntheticPracticeFlowSession,
  syntheticSuspiciousFastSession,
} from '/src/core/analyze-session/index.ts';

const fixtures = [
  syntheticCellClickSession,
  syntheticPracticeFlowSession,
  syntheticSuspiciousFastSession,
];

const round = (value, digits = 4) => {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
};

const percentileNearestRank = (values, percentile) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1));
  return sorted[index];
};

const summarize = (totalMs, sessionCount) => ({
  totalMs: round(totalMs),
  perSessionMs: round(totalMs / sessionCount, 6),
  sessionsPerSecond: round((sessionCount / totalMs) * 1000, 2),
});

function createFrameProbe() {
  const frameDeltas = [];
  const longTasks = [];
  let running = false;
  let lastTimestamp = 0;
  let observer;

  const tick = (timestamp) => {
    if (!running) return;
    if (lastTimestamp > 0) {
      frameDeltas.push(timestamp - lastTimestamp);
    }
    lastTimestamp = timestamp;
    requestAnimationFrame(tick);
  };

  return {
    async start() {
      running = true;
      lastTimestamp = 0;
      if ('PerformanceObserver' in window) {
        try {
          observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              longTasks.push(entry.duration);
            }
          });
          observer.observe({ type: 'longtask', buffered: false });
        } catch {
          observer = undefined;
        }
      }
      requestAnimationFrame(tick);
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    },
    async stop() {
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      running = false;
      observer?.disconnect();
      const p95 = percentileNearestRank(frameDeltas, 95);
      const p99 = percentileNearestRank(frameDeltas, 99);
      const maxFrameDeltaMs = frameDeltas.length > 0 ? Math.max(...frameDeltas) : 0;
      const maxLongTaskMs = longTasks.length > 0 ? Math.max(...longTasks) : 0;
      const droppedFrames = frameDeltas.filter((delta) => delta > 20).length;

      return {
        frameCount: frameDeltas.length,
        maxFrameDeltaMs: round(maxFrameDeltaMs),
        p95FrameDeltaMs: round(p95),
        p99FrameDeltaMs: round(p99),
        droppedFrames,
        longTaskCount: longTasks.length,
        maxLongTaskMs: round(maxLongTaskMs),
        passesSmokeBudget: p95 <= 34 && maxLongTaskMs <= 250,
      };
    },
  };
}

async function measureFrameBudget(callback) {
  const probe = createFrameProbe();
  await probe.start();
  const result = await callback();
  const frameBudget = await probe.stop();
  return { result, frameBudget };
}

function runTsFallbackBenchmark(iterations) {
  const sessionCount = iterations * fixtures.length;
  const startedAt = performance.now();

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const fixture of fixtures) {
      analyzeSession(fixture);
    }
  }

  return summarize(performance.now() - startedAt, sessionCount);
}

function createWasmWorker() {
  const workerSource = \`
    const wasmModuleUrl = new URL('/scratch/kognitika-core-wasm-web/kognitika_core.js', self.location.origin).href;
    const wasmBinaryUrl = new URL('/scratch/kognitika-core-wasm-web/kognitika_core_bg.wasm', self.location.origin).href;

    const round = (value, digits = 4) => {
      const multiplier = 10 ** digits;
      return Math.round(value * multiplier) / multiplier;
    };

    const summarize = (totalMs, sessionCount) => ({
      totalMs: round(totalMs),
      perSessionMs: round(totalMs / sessionCount, 6),
      sessionsPerSecond: round((sessionCount / totalMs) * 1000, 2),
    });

    let wasm;
    let initMs = 0;

    async function init() {
      const startedAt = performance.now();
      wasm = await import(wasmModuleUrl);
      await wasm.default(wasmBinaryUrl);
      initMs = performance.now() - startedAt;
      self.postMessage({ type: 'ready', initMs: round(initMs) });
    }

    self.onmessage = (event) => {
      const { fixtures, expectedJson, iterations } = event.data;
      const sessionCount = iterations * fixtures.length;
      const startedAt = performance.now();
      let parityOk = true;

      for (let iteration = 0; iteration < iterations; iteration += 1) {
        for (let index = 0; index < fixtures.length; index += 1) {
          const output = wasm.analyzeSessionJson(JSON.stringify(fixtures[index]));
          const normalized = JSON.stringify(JSON.parse(output));
          if (iteration === 0 && normalized !== expectedJson[index]) {
            parityOk = false;
          }
        }
      }

      self.postMessage({
        type: 'result',
        initMs: round(initMs),
        parityOk,
        ...summarize(performance.now() - startedAt, sessionCount),
      });
    };

    init().catch((error) => {
      self.postMessage({ type: 'error', message: String(error?.message || error) });
    });
  \`;

  const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
  return { worker: new Worker(workerUrl, { type: 'module' }), workerUrl };
}

async function runWasmWorkerBenchmark(iterations, expectedJson) {
  const { worker, workerUrl } = createWasmWorker();

  try {
    const result = await new Promise((resolve, reject) => {
      worker.onmessage = (event) => {
        if (event.data.type === 'ready') {
          worker.postMessage({ fixtures, expectedJson, iterations });
        }

        if (event.data.type === 'result') {
          const { type: _type, ...result } = event.data;
          resolve(result);
        }

        if (event.data.type === 'error') {
          reject(new Error(event.data.message));
        }
      };

      worker.onerror = (event) => {
        reject(new Error(event.message));
      };
    });

    return result;
  } finally {
    worker.terminate();
    URL.revokeObjectURL(workerUrl);
  }
}

window.__runAnalyzeSessionBrowserBenchmark = async ({ iterations, expectedJson }) => {
  const tsMainThread = await measureFrameBudget(async () => runTsFallbackBenchmark(iterations));
  const wasmWorker = await measureFrameBudget(async () => runWasmWorkerBenchmark(iterations, expectedJson));

  return {
    tsMainThread: {
      ...tsMainThread.result,
      frameBudget: tsMainThread.frameBudget,
    },
    wasmWorker: {
      ...wasmWorker.result,
      frameBudget: wasmWorker.frameBudget,
    },
  };
};
`,
    'utf8',
  );
}

async function startViteServer(): Promise<ViteDevServer> {
  const server = await createServer({
    root: rootDir,
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: benchmarkPort,
      strictPort: true,
      fs: {
        allow: [rootDir],
      },
    },
  });
  await server.listen();
  return server;
}

function makeDecision(report: BrowserBenchmarkResult) {
  if (!report.wasmWorker.parityOk) {
    return 'Parity failed in the browser Worker. Do not proceed to runtime integration.';
  }

  const wasmFaster = report.wasmWorker.perSessionMs < report.tsMainThread.perSessionMs * 0.85;
  const workerFrameAdvantage = report.wasmWorker.frameBudget.p95FrameDeltaMs < report.tsMainThread.frameBudget.p95FrameDeltaMs
    || report.wasmWorker.frameBudget.longTaskCount < report.tsMainThread.frameBudget.longTaskCount;

  if (wasmFaster && workerFrameAdvantage) {
    return 'Rust/WASM Worker is a candidate for heavier browser batch analysis, but still keep TypeScript as the default until route-level UX tests prove user-visible benefit.';
  }

  if (workerFrameAdvantage) {
    return 'Worker isolation helps frame budget, but Rust/WASM is not clearly faster. Prefer moving heavy analysis off the main thread first; do not switch the production web runtime to WASM yet.';
  }

  return 'Rust/WASM browser Worker does not show enough benefit for current synthetic sessions. Keep the web runtime on TypeScript fallback and reserve Rust for server-side analytics, heavier batch jobs, or native mobile bindings.';
}

function makeMarkdownReport(report: BrowserBenchmarkResult) {
  return `# AnalyzeSession Browser Worker Frame-Budget Benchmark

Date: ${report.generatedAt}

Related issue: #108

## Summary

This benchmark compares the existing TypeScript fallback running on the browser
main thread with the Rust/WASM implementation running inside a browser Worker.
It uses Vite and Playwright/Chromium so the result reflects browser scheduling
and Worker isolation more closely than the Node Worker benchmark in #106.

Synthetic fixtures only were used. No real user data, raw Brain ID, tokens,
emails, screenshots, raw storage, or private telemetry are included.

## Method

- Browser: Chromium via Playwright
- Fixtures: ${report.fixtureCount}
- Iterations per fixture: ${report.iterations}
- Total sessions per implementation: ${report.sessionCount}
- WASM build command: \`wasm-pack build crates/kognitika-core --target web --release\`
- Benchmark command: \`pnpm benchmark:analyze-session:browser\`

## Throughput

| Implementation | Init ms | Total ms | Per session ms | Sessions/sec | Parity |
| --- | ---: | ---: | ---: | ---: | --- |
| TypeScript fallback main thread | 0 | ${report.tsMainThread.totalMs} | ${report.tsMainThread.perSessionMs} | ${report.tsMainThread.sessionsPerSecond} | source of truth |
| Rust/WASM browser Worker | ${report.wasmWorker.initMs} | ${report.wasmWorker.totalMs} | ${report.wasmWorker.perSessionMs} | ${report.wasmWorker.sessionsPerSecond} | ${report.wasmWorker.parityOk ? 'ok' : 'failed'} |

## Frame Budget

| Implementation | Frames | p95 delta ms | p99 delta ms | Max delta ms | Dropped frames | Long tasks | Max long task ms | Smoke budget |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| TypeScript fallback main thread | ${report.tsMainThread.frameBudget.frameCount} | ${report.tsMainThread.frameBudget.p95FrameDeltaMs} | ${report.tsMainThread.frameBudget.p99FrameDeltaMs} | ${report.tsMainThread.frameBudget.maxFrameDeltaMs} | ${report.tsMainThread.frameBudget.droppedFrames} | ${report.tsMainThread.frameBudget.longTaskCount} | ${report.tsMainThread.frameBudget.maxLongTaskMs} | ${report.tsMainThread.frameBudget.passesSmokeBudget ? 'pass' : 'fail'} |
| Rust/WASM browser Worker | ${report.wasmWorker.frameBudget.frameCount} | ${report.wasmWorker.frameBudget.p95FrameDeltaMs} | ${report.wasmWorker.frameBudget.p99FrameDeltaMs} | ${report.wasmWorker.frameBudget.maxFrameDeltaMs} | ${report.wasmWorker.frameBudget.droppedFrames} | ${report.wasmWorker.frameBudget.longTaskCount} | ${report.wasmWorker.frameBudget.maxLongTaskMs} | ${report.wasmWorker.frameBudget.passesSmokeBudget ? 'pass' : 'fail'} |

## Optional WASM Asset Impact

| Asset | Bytes |
| --- | ---: |
| JS glue | ${report.wasmAssets.jsBytes} |
| WASM binary | ${report.wasmAssets.wasmBytes} |
| Total | ${report.wasmAssets.totalBytes} |

## Decision

${report.decision}

## Next Step

Do not switch production web runtime to WASM from this benchmark alone. If we
continue, test a heavier real analytical batch or move the same contract into a
server-side analytics job where Rust has a clearer workload advantage.
`;
}

async function main() {
  buildWasmPackage();
  writeBenchmarkPage();

  const server = await startViteServer();
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${benchmarkPort}/scratch/analyze-session-browser-benchmark/index.html`);
    await page.waitForFunction(() => typeof window.__runAnalyzeSessionBrowserBenchmark === 'function');

    const browserResult = await page.evaluate(
      async ({ iterations, expectedJson }) => window.__runAnalyzeSessionBrowserBenchmark({ iterations, expectedJson }),
      { iterations, expectedJson },
    );

    const wasmAssets = {
      jsBytes: statSync(join(wasmOutDir, 'kognitika_core.js')).size,
      wasmBytes: statSync(join(wasmOutDir, 'kognitika_core_bg.wasm')).size,
      totalBytes: 0,
    };
    wasmAssets.totalBytes = wasmAssets.jsBytes + wasmAssets.wasmBytes;

    const report: BrowserBenchmarkResult = {
      generatedAt: new Date().toISOString(),
      iterations,
      fixtureCount: fixtures.length,
      sessionCount: iterations * fixtures.length,
      wasmAssets,
      tsMainThread: browserResult.tsMainThread,
      wasmWorker: browserResult.wasmWorker,
      decision: '',
    };
    report.decision = makeDecision(report);

    const reportPath = join(rootDir, 'docs', 'analyze-session-browser-worker-benchmark.md');
    writeFileSync(reportPath, makeMarkdownReport(report), 'utf8');
    console.log(JSON.stringify(report, null, 2));
    console.log(`Wrote ${reportPath}`);
  } finally {
    await browser.close();
    await server.close();
  }
}

declare global {
  interface Window {
    __runAnalyzeSessionBrowserBenchmark?: (input: {
      iterations: number;
      expectedJson: string[];
    }) => Promise<{
      tsMainThread: BenchmarkStats & { frameBudget: FrameBudgetStats };
      wasmWorker: BenchmarkStats & {
        initMs: number;
        parityOk: boolean;
        frameBudget: FrameBudgetStats;
      };
    }>;
  }
}

await main();
