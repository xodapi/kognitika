import { describe, expect, it } from 'vitest';
import { aggregateLongitudinalAnalytics, LONGITUDINAL_ANALYTICS_VERSION } from '../lib/longitudinal-analytics.ts';

const asOf = new Date('2026-08-20T12:00:00.000Z');
const observation = (daysAgo: number, accuracy: number, reactionMs: number) => ({
  occurredAt: new Date(asOf.getTime() - daysAgo * 86_400_000),
  accuracy,
  reactionMs,
});

describe('longitudinal analytics v1', () => {
  it('returns all canonical windows and explicit insufficient data', () => {
    const result = aggregateLongitudinalAnalytics([observation(1, 0.8, 200)], asOf);
    expect(result.version).toBe(LONGITUDINAL_ANALYTICS_VERSION);
    expect(result.windows.map((window) => window.days)).toEqual([7, 30, 90]);
    expect(result.windows[0].status).toBe('insufficient_data');
    expect(result.windows[0].accuracy.mean).toBeNull();
    expect(result.windows[0].speed.meanReactionMs).toBeNull();
  });

  it('separates accuracy and speed, with uncertainty and coverage', () => {
    const result = aggregateLongitudinalAnalytics([
      observation(1, 0.6, 100),
      observation(2, 0.8, 200),
      observation(3, 1, 300),
      observation(40, 0.9, 900),
    ], asOf);
    const week = result.windows[0];
    expect(week.status).toBe('ready');
    expect(week.accuracy.mean).toBe(0.8);
    expect(week.speed.meanReactionMs).toBe(200);
    expect(week.accuracy.standardError).toBeGreaterThan(0);
    expect(week.speed.standardErrorMs).toBeGreaterThan(0);
    expect(week.coverage).toEqual({ observedDays: 3, proportion: 0.429 });
    expect(result.windows[1].sessionCount).toBe(3);
    expect(result.windows[2].sessionCount).toBe(4);
  });
});
