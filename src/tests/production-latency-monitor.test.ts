import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findActiveAsset,
  runMonitor,
  updateConsecutiveState,
} from '../../scripts/production-latency-monitor.mjs';

function response(body: string, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'application/json' } });
}

describe('production latency monitor', () => {
  it('finds the active hashed asset from index HTML', () => {
    expect(findActiveAsset('<script src="/assets/app-abc123.js"></script>')).toBe('/assets/app-abc123.js');
    expect(findActiveAsset('<main>no bundle</main>')).toBeNull();
  });

  it('alerts only after the configured consecutive breach count', () => {
    expect(updateConsecutiveState(undefined, true)).toMatchObject({ consecutiveBreaches: 1, alert: false });
    expect(updateConsecutiveState({ consecutiveBreaches: 2 }, true)).toMatchObject({ consecutiveBreaches: 3, alert: true });
    expect(updateConsecutiveState({ consecutiveBreaches: 2 }, false)).toMatchObject({ consecutiveBreaches: 0, alert: false });
  });

  it('reports build, timing, proxy mode, and sustained failure state without private fields', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'kognitika-latency-'));
    const stateFile = path.join(root, 'state.json');
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('/')) return response('<script src="/assets/app-abc123.js"></script>');
      if (url.includes('/api/health')) return response(JSON.stringify({ status: 'ok', buildId: 'synthetic-build' }));
      return response('synthetic asset');
    };
    const first = await runMonitor({
      baseUrl: 'https://kognitika.ru',
      stateFile,
      fetchImpl,
      env: { HTTPS_PROXY: 'http://proxy.synthetic', NO_PROXY: '' },
    });

    expect(first).toMatchObject({
      buildId: 'synthetic-build',
      breached: false,
      consecutiveBreaches: 0,
      alert: false,
    });
    expect(first.measurements).toHaveLength(3);
    expect(first.measurements.every((measurement) => measurement.proxy === 'proxy')).toBe(true);
    expect(JSON.stringify(first)).not.toMatch(/token|brainId|email|password/i);
    await rm(root, { recursive: true, force: true });
  });
});
