import { expect, test } from '@playwright/test';
import { collectUnexpectedBrowserErrors, expectAppReady, installSyntheticApi } from './helpers';

test.describe('Frame budget diagnostics', () => {
  test.beforeEach(async ({ page }) => {
    await installSyntheticApi(page);
  });

  test('captures a privacy-safe Schulte frame-budget smoke report', async ({ page }, testInfo) => {
    const browserErrors = collectUnexpectedBrowserErrors(page);

    await page.goto('/schulte');
    await expectAppReady(page);

    const report = await page.evaluate(async () => {
      const frameBudgetMs = 16.67;
      const samples: number[] = [];
      const inputLatency: number[] = [];
      const longTasks: number[] = [];

      let cleanupLongTasks = () => {};
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => longTasks.push(entry.duration));
          });
          observer.observe({ type: 'longtask', buffered: true });
          cleanupLongTasks = () => observer.disconnect();
        } catch {
          cleanupLongTasks = () => {};
        }
      }

      const percentile = (values: number[], rank: number) => {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        return sorted[Math.min(sorted.length - 1, Math.ceil(rank * sorted.length) - 1)];
      };

      const onInput = () => {
        const startedAt = performance.now();
        requestAnimationFrame(() => inputLatency.push(performance.now() - startedAt));
      };
      document.addEventListener('pointerdown', onInput, { passive: true, capture: true });

      const startedAt = performance.now();
      let lastFrameAt = startedAt;

      const done = new Promise<Record<string, unknown>>((resolve) => {
        const step: FrameRequestCallback = (timestamp) => {
          samples.push(timestamp - lastFrameAt);
          lastFrameAt = timestamp;

          if (timestamp - startedAt >= 750) {
            document.removeEventListener('pointerdown', onInput, { capture: true });
            cleanupLongTasks();

            const droppedFrames = samples.reduce((sum, deltaMs) => (
              sum + Math.max(0, Math.round(deltaMs / frameBudgetMs) - 1)
            ), 0);

            resolve({
              frameCount: samples.length,
              droppedFrames,
              p95FrameDeltaMs: Number(percentile(samples, 0.95).toFixed(2)),
              p99FrameDeltaMs: Number(percentile(samples, 0.99).toFixed(2)),
              p95InputFeedbackMs: Number(percentile(inputLatency, 0.95).toFixed(2)),
              longTaskCount: longTasks.length,
              maxLongTaskMs: longTasks.length > 0 ? Number(Math.max(...longTasks).toFixed(2)) : 0,
              containsPersonalData: false,
            });
            return;
          }

          requestAnimationFrame(step);
        };

        requestAnimationFrame(step);
        document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });

      return done;
    });

    await testInfo.attach('schulte-frame-budget-smoke.json', {
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(report, null, 2)),
    });

    expect(report.frameCount).toBeGreaterThan(10);
    expect(report.p95FrameDeltaMs).toBeLessThanOrEqual(250);
    expect(report.p95InputFeedbackMs).toBeLessThanOrEqual(250);
    expect(JSON.stringify(report)).not.toMatch(/email|brainId|token|password|localStorage/i);
    expect(browserErrors).toEqual([]);
  });
});
