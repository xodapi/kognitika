import { describe, expect, it } from 'vitest';
import {
  aggregateLongitudinalAnalytics,
  aggregateQualityFilteredLongitudinalAnalytics,
  LONGITUDINAL_ANALYTICS_VERSION,
} from '../lib/longitudinal-analytics.ts';

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

  it('excludes malformed metrics and future observations without contaminating aggregates', () => {
    const result = aggregateLongitudinalAnalytics([
      observation(1, 0.6, 100),
      observation(2, 0.8, 200),
      observation(3, 1, 300),
      observation(1, Number.NaN, 100),
      observation(1, Number.POSITIVE_INFINITY, 100),
      observation(1, -0.1, 100),
      observation(1, 1.1, 100),
      observation(1, 0.5, Number.NaN),
      observation(1, 0.5, Number.POSITIVE_INFINITY),
      observation(1, 0.5, -1),
      { occurredAt: new Date(Number.NaN), accuracy: 0.5, reactionMs: 100 },
      observation(-1, 0.5, 100),
    ], asOf);

    expect(result.windows[0]).toMatchObject({
      status: 'ready',
      sessionCount: 3,
      accuracy: { mean: 0.8 },
      speed: { meanReactionMs: 200 },
    });
  });

  it('uses inclusive elapsed-time cutoffs and UTC day coverage', () => {
    const nearMidnight = new Date('2026-08-20T00:30:00.000Z');
    const atSevenDayCutoff = {
      occurredAt: new Date('2026-08-13T00:30:00.000Z'),
      accuracy: 0.6,
      reactionMs: 100,
    };
    const result = aggregateLongitudinalAnalytics([
      atSevenDayCutoff,
      { ...atSevenDayCutoff, occurredAt: new Date('2026-08-13T00:29:59.999Z'), accuracy: 0.7 },
      { ...atSevenDayCutoff, occurredAt: new Date('2026-08-19T23:30:00.000Z'), accuracy: 0.8, reactionMs: 200 },
      { ...atSevenDayCutoff, occurredAt: new Date('2026-08-20T00:15:00.000Z'), accuracy: 1, reactionMs: 300 },
      { ...atSevenDayCutoff, occurredAt: new Date('2026-07-21T00:30:00.000Z') },
      { ...atSevenDayCutoff, occurredAt: new Date('2026-05-22T00:30:00.000Z') },
    ], nearMidnight);

    expect(result.windows[0]).toMatchObject({
      status: 'ready',
      sessionCount: 3,
      coverage: { observedDays: 3, proportion: 0.429 },
      accuracy: { mean: 0.8 },
    });
    expect(result.windows[1].sessionCount).toBe(5);
    expect(result.windows[2].sessionCount).toBe(6);
  });

  it('counts quality exclusions while aggregating only eligible observations', () => {
    const result = aggregateQualityFilteredLongitudinalAnalytics([
      { ...observation(1, 0.6, 100), completed: true, eventCount: 1, suspiciousPatternScore: 0.2 },
      { ...observation(2, 0.8, 200), completed: true, eventCount: 1, suspiciousPatternScore: 0.2 },
      { ...observation(3, 1, 300), completed: true, eventCount: 1, suspiciousPatternScore: 0.2 },
      { ...observation(4, 0.5, 250), completed: true, eventCount: 1, suspiciousPatternScore: 0.3 },
      { ...observation(5, Number.NaN, 250), completed: true, eventCount: 1, suspiciousPatternScore: 0.2 },
    ], asOf, 0.2);

    expect(result.windows[0]).toMatchObject({
      status: 'ready',
      sessionCount: 3,
      accuracy: { mean: 0.8 },
      quality: {
        denominator: 5,
        eligibleCount: 3,
        excludedCount: 2,
        exclusions: {
          score_exceeds_policy: 1,
          missing_or_invalid_accuracy: 1,
          not_completed: 0,
        },
      },
    });
  });

  it('uses eligible counts for readiness and excludes invalid or future dates from denominators', () => {
    const result = aggregateQualityFilteredLongitudinalAnalytics([
      { ...observation(1, 0.8, 200), completed: true, eventCount: 1, suspiciousPatternScore: 0.2 },
      { ...observation(2, 0.8, 200), completed: true, eventCount: 1, suspiciousPatternScore: 0.2 },
      { ...observation(3, 0.8, 200), completed: true, eventCount: 0, suspiciousPatternScore: 0.2 },
      { ...observation(4, 0.8, 200), completed: true, eventCount: 0, suspiciousPatternScore: 0.2 },
      { ...observation(-1, 0.8, 200), completed: true, eventCount: 1, suspiciousPatternScore: 0.2 },
      { occurredAt: new Date(Number.NaN), completed: true, eventCount: 1, suspiciousPatternScore: 0.2, accuracy: 0.8, reactionMs: 200 },
    ], asOf, 0.2);

    expect(result.windows[0]).toMatchObject({
      status: 'insufficient_data',
      sessionCount: 2,
      accuracy: { mean: null },
      quality: {
        denominator: 4,
        eligibleCount: 2,
        excludedCount: 2,
        exclusions: { missing_or_empty_event_count: 2 },
      },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/brain|telemetry|diagnos|fraud|clinical/i);
    expect(serialized).not.toContain('sessionId');
    expect(serialized).not.toContain('userId');
  });
});
