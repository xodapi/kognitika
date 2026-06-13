import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('analytics ClickEvent contract', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('uses the JS fallback when Worker is unavailable', async () => {
    vi.stubGlobal('Worker', undefined);
    const { analyzeSession } = await import('../lib/cognitive-metrics');

    const result = await analyzeSession([
      { cellId: 1, reactionTimeMs: 100 },
      { cellId: 2, reactionTimeMs: 200 },
      { cellId: 3, reactionTimeMs: 300 },
    ]);

    expect(result.averageTime).toBe(200);
    expect(result.fatigability).toBe(100);
    expect(result.stabilityIndex).toBeCloseTo(81.65, 1);
    expect(result.reactionConsistency).toBeCloseTo(59.17, 1);
  });

  it('posts canonical cellId and reactionTimeMs events to the worker', async () => {
    let postedMessage: unknown;

    class FakeWorker {
      private listener: ((event: MessageEvent) => void) | null = null;

      addEventListener(_type: 'message', listener: (event: MessageEvent) => void) {
        this.listener = listener;
      }

      removeEventListener() {
        this.listener = null;
      }

      postMessage(message: unknown) {
        postedMessage = message;
        this.listener?.({
          data: {
            type: 'SESSION_ANALYSIS',
            payload: {
              average_time: 150,
              stability_index: 25,
              fatigability: 50,
              reaction_consistency: 90,
            },
          },
        } as MessageEvent);
      }
    }

    vi.stubGlobal('Worker', FakeWorker);
    const { analyzeSession } = await import('../lib/cognitive-metrics');

    await expect(analyzeSession([
      { cellId: 10, reactionTimeMs: 120 },
      { cellId: 11, reactionTimeMs: 180 },
    ])).resolves.toEqual({
      averageTime: 150,
      stabilityIndex: 25,
      fatigability: 50,
      reactionConsistency: 90,
    });

    expect(postedMessage).toEqual({
      type: 'ANALYZE_SESSION',
      data: {
        events: [
          { cellId: 10, reactionTimeMs: 120 },
          { cellId: 11, reactionTimeMs: 180 },
        ],
      },
    });
    expect(JSON.stringify(postedMessage)).not.toContain('reaction_time');
    expect(JSON.stringify(postedMessage)).not.toContain('reactionTime"');
  });

  it('does not reference a missing analytics-kernel package', async () => {
    const [bridge, worker] = await Promise.all([
      readFile(path.join(process.cwd(), 'src/lib/cognitive-metrics.ts'), 'utf8'),
      readFile(path.join(process.cwd(), 'src/workers/analytics.worker.ts'), 'utf8'),
    ]);

    expect(`${bridge}\n${worker}`).not.toContain('packages/analytics-kernel');
  });
});
