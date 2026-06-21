import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { Worker } from 'node:worker_threads';
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

interface WasmWorkerResult extends BenchmarkStats {
  initMs: number;
  parityOk: boolean;
}

const iterations = Number(process.env.ANALYZE_SESSION_BENCH_ITERATIONS || 5_000);
const rootDir = resolve(import.meta.dirname, '..');
const crateDir = join(rootDir, 'crates', 'kognitika-core');
const wasmOutDir = join(rootDir, 'scratch', 'kognitika-core-wasm-node');
const wasmEntry = join(wasmOutDir, 'kognitika_core.js');

const fixtures = [
  syntheticCellClickSession,
  syntheticPracticeFlowSession,
  syntheticSuspiciousFastSession,
] as const;

const fixtureJson = fixtures.map((fixture) => JSON.stringify(fixture));
const expectedJson = fixtures.map((fixture) => JSON.stringify(analyzeSession(fixture)));

function round(value: number, digits = 4) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function summarize(totalMs: number, sessionCount: number): BenchmarkStats {
  return {
    totalMs: round(totalMs),
    perSessionMs: round(totalMs / sessionCount, 6),
    sessionsPerSecond: round((sessionCount / totalMs) * 1000, 2),
  };
}

function runTsFallbackBenchmark(): BenchmarkStats {
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
  const workerSource = `
    const { parentPort, workerData } = require('node:worker_threads');
    const { performance } = require('node:perf_hooks');

    const initStartedAt = performance.now();
    const wasm = require(workerData.wasmEntry);
    const initMs = performance.now() - initStartedAt;

    parentPort.on('message', (message) => {
      const startedAt = performance.now();
      let parityOk = true;

      for (let iteration = 0; iteration < message.iterations; iteration += 1) {
        for (let index = 0; index < message.fixtures.length; index += 1) {
          const output = wasm.analyzeSessionJson(message.fixtures[index]);
          const normalizedOutput = JSON.stringify(JSON.parse(output));
          if (iteration === 0 && normalizedOutput !== message.expected[index]) {
            parityOk = false;
          }
        }
      }

      const totalMs = performance.now() - startedAt;
      parentPort.postMessage({
        type: 'result',
        initMs,
        totalMs,
        parityOk,
      });
    });

    parentPort.postMessage({ type: 'ready', initMs });
  `;

  return new Worker(workerSource, {
    eval: true,
    workerData: { wasmEntry },
  });
}

async function runWasmWorkerBenchmark(): Promise<WasmWorkerResult> {
  const worker = createWasmWorker();
  const sessionCount = iterations * fixtures.length;

  const result = await new Promise<WasmWorkerResult>((resolvePromise, reject) => {
    let initMs = 0;

    worker.on('message', (message: { type: string; initMs?: number; totalMs?: number; parityOk?: boolean }) => {
      if (message.type === 'ready') {
        initMs = message.initMs || 0;
        worker.postMessage({
          iterations,
          fixtures: fixtureJson,
          expected: expectedJson,
        });
      }

      if (message.type === 'result') {
        resolvePromise({
          initMs: round(message.initMs ?? initMs),
          parityOk: Boolean(message.parityOk),
          ...summarize(message.totalMs || 0, sessionCount),
        });
      }
    });

    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`WASM worker exited with code ${code}`));
      }
    });
  });

  await worker.terminate();
  return result;
}

function buildWasmPackage() {
  mkdirSync(wasmOutDir, { recursive: true });
  execFileSync('wasm-pack', [
    'build',
    crateDir,
    '--target',
    'nodejs',
    '--out-dir',
    wasmOutDir,
    '--release',
  ], {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

function makeMarkdownReport(report: {
  generatedAt: string;
  iterations: number;
  fixtureCount: number;
  tsFallback: BenchmarkStats;
  wasmWorker: WasmWorkerResult;
  decision: string;
}) {
  return `# AnalyzeSession Rust/WASM Worker Benchmark

Date: ${report.generatedAt}

Related issue: #106

## Summary

This benchmark compares the existing TypeScript fallback for
\`AnalyzeSession\` with the Rust/WASM implementation loaded through a Node
Worker boundary. The Worker is used as a local stand-in for the browser Worker
architecture decision: Rust/WASM must not run directly inside React render.

Synthetic fixtures only were used. No real user data, raw Brain ID, tokens,
emails, screenshots, raw storage, or private telemetry are included.

## Method

- Fixtures: ${report.fixtureCount}
- Iterations per fixture: ${report.iterations}
- Total sessions per implementation: ${report.iterations * report.fixtureCount}
- WASM build command: \`wasm-pack build crates/kognitika-core --target nodejs --release\`
- TS command: \`pnpm benchmark:analyze-session\`

## Results

| Implementation | Init ms | Total ms | Per session ms | Sessions/sec | Parity |
| --- | ---: | ---: | ---: | ---: | --- |
| TypeScript fallback | 0 | ${report.tsFallback.totalMs} | ${report.tsFallback.perSessionMs} | ${report.tsFallback.sessionsPerSecond} | source of truth |
| Rust/WASM Worker | ${report.wasmWorker.initMs} | ${report.wasmWorker.totalMs} | ${report.wasmWorker.perSessionMs} | ${report.wasmWorker.sessionsPerSecond} | ${report.wasmWorker.parityOk ? 'ok' : 'failed'} |

## Decision

${report.decision}

## Next Step

Do not switch production web runtime to WASM yet. If we continue, the next
step is a browser Worker benchmark in Vite/Playwright that measures main-thread
frame budget, cold-load cost, and bundle impact on real routes.
`;
}

async function main() {
  buildWasmPackage();

  const tsFallback = runTsFallbackBenchmark();
  const wasmWorker = await runWasmWorkerBenchmark();
  const decision = wasmWorker.parityOk
    ? 'Parity is confirmed through the Worker boundary. Treat Rust/WASM as a candidate for heavier batch/session analysis, but keep TypeScript as the default web runtime until browser Worker frame-budget measurements justify integration.'
    : 'Parity failed. Do not proceed to runtime integration until Rust/WASM output matches the TypeScript contract exactly.';

  const report = {
    generatedAt: new Date().toISOString(),
    iterations,
    fixtureCount: fixtures.length,
    tsFallback,
    wasmWorker,
    decision,
  };

  const reportPath = join(rootDir, 'docs', 'analyze-session-wasm-benchmark.md');
  writeFileSync(reportPath, makeMarkdownReport(report), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${reportPath}`);
}

await main();
