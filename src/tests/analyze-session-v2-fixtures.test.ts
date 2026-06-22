import { describe, expect, it } from 'vitest';
import {
  AnalyzeSessionInputSchema,
  analyzeSession,
  createAbandonedCheckpointSession,
  createFatigueCurveSession,
  createGoldenV2Sessions,
  createRecoveryAfterFatigueSession,
  createSuspiciousBurstSession,
  createTenThousandMixedSession,
  createThousandClickSession,
  syntheticGoldenV2Sessions,
} from '../core/analyze-session';

describe('AnalyzeSession golden fixtures v2', () => {
  it('generates deterministic synthetic fixtures without identity material', () => {
    const first = JSON.stringify(createGoldenV2Sessions());
    const second = JSON.stringify(createGoldenV2Sessions());

    expect(first).toBe(second);
    expect(syntheticGoldenV2Sessions).toHaveLength(7);
    for (const session of syntheticGoldenV2Sessions) {
      expect(AnalyzeSessionInputSchema.safeParse(session).success).toBe(true);
      expect(JSON.stringify(session)).not.toMatch(/brainId|token|email|password|localStorage|rawStorage/i);
    }
  });

  it('handles one thousand click events', () => {
    const result = analyzeSession(createThousandClickSession());

    expect(result.clickCount).toBe(1_000);
    expect(result.p50ReactionMs).toBeGreaterThanOrEqual(190);
    expect(result.p95ReactionMs).toBeLessThanOrEqual(230);
    expect(result.suspiciousPatternScore).toBe(0);
  });

  it('handles ten thousand mixed events at the schema boundary', () => {
    const session = createTenThousandMixedSession();
    const result = analyzeSession(session);

    expect(session.events).toHaveLength(10_000);
    expect(result.durationMs).toBe(599_940);
    expect(result.clickCount).toBeGreaterThan(6_000);
    expect(result.accuracy).toBeGreaterThan(0.9);
  });

  it('detects fatigue, suspicious burst, abandoned, and recovery scenarios', () => {
    expect(analyzeSession(createFatigueCurveSession())).toMatchObject({
      fatigueIndex: expect.any(Number),
      recommendationSignals: expect.arrayContaining(['recovery']),
    });
    expect(analyzeSession(createFatigueCurveSession()).fatigueIndex).toBeGreaterThan(0.45);

    const suspicious = analyzeSession(createSuspiciousBurstSession());
    expect(suspicious.suspiciousPatternScore).toBe(1);

    const abandoned = analyzeSession(createAbandonedCheckpointSession());
    expect(abandoned.engagementIndex).toBeLessThan(0.35);
    expect(abandoned.recommendationSignals).toContain('weak_area');

    const recovery = analyzeSession(createRecoveryAfterFatigueSession());
    expect(recovery.fatigueIndex).toBeLessThan(0);
    expect(recovery.recommendationSignals).toContain('streak_maintenance');
  });
});
