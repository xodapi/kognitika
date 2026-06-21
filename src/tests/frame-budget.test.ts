import { describe, expect, it } from 'vitest';
import {
  FRAME_BUDGET_TARGETS,
  FRAME_CRITICAL_ROUTES,
  NON_FRAME_CRITICAL_ROUTES,
  runFrameBudgetProbe,
  summarizeFrameBudget,
} from '../lib/frame-budget';

describe('frame budget benchmark contract', () => {
  it('documents the 60 FPS frame budget targets and route scope', () => {
    expect(FRAME_BUDGET_TARGETS.fps60FrameBudgetMs).toBeCloseTo(16.67, 2);
    expect(FRAME_BUDGET_TARGETS.appWorkTargetMs).toBeLessThanOrEqual(10);
    expect(FRAME_CRITICAL_ROUTES).toContain('/schulte');
    expect(FRAME_CRITICAL_ROUTES).toContain('/stroop');
    expect(FRAME_CRITICAL_ROUTES).toContain('/typing');
    expect(NON_FRAME_CRITICAL_ROUTES).toContain('/admin');
    expect(NON_FRAME_CRITICAL_ROUTES).toContain('/wiki');
  });

  it('summarizes dropped frames, long tasks, and input latency percentiles', () => {
    const report = summarizeFrameBudget(
      [
        { deltaMs: 16 },
        { deltaMs: 17 },
        { deltaMs: 33 },
        { deltaMs: 50 },
        { deltaMs: 16 },
      ],
      [
        { durationMs: 51 },
        { durationMs: 120 },
      ],
      [
        { durationMs: 12 },
        { durationMs: 28 },
        { durationMs: 44 },
      ],
    );

    expect(report).toMatchObject({
      frameCount: 5,
      droppedFrames: 3,
      longTaskCount: 2,
      maxLongTaskMs: 120,
      p95InputFeedbackMs: 44,
      passesSmokeBudget: false,
    });
    expect(report.p95FrameDeltaMs).toBe(50);
    expect(report.p99FrameDeltaMs).toBe(50);
  });

  it('runs a deterministic probe with injectable browser primitives', async () => {
    const frameTimes = [16, 32, 48, 64, 80, 96];
    let nowMs = 0;

    const result = await runFrameBudgetProbe({
      durationMs: 64,
      now: () => nowMs,
      requestAnimationFrame: (callback) => {
        const timestamp = frameTimes.shift() ?? 112;
        nowMs = timestamp;
        queueMicrotask(() => callback(timestamp));
        return timestamp;
      },
      cancelAnimationFrame: () => {},
      addInputListeners: (handler) => {
        handler(new Event('pointerdown'));
        return () => {};
      },
      observeLongTasks: (handler) => {
        handler({ durationMs: 24 });
        return () => {};
      },
    });

    expect(result.samples.length).toBeGreaterThanOrEqual(3);
    expect(result.longTasks).toEqual([{ durationMs: 24 }]);
    expect(result.inputFeedback[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(result.report.passesSmokeBudget).toBe(true);
  });
});
