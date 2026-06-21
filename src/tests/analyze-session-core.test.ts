import { describe, expect, it } from 'vitest';
import {
  AnalyzeSessionOutputSchema,
  analyzeSession,
  parseAnalyzeSessionInput,
  syntheticCellClickSession,
  syntheticPracticeFlowSession,
  syntheticSuspiciousFastSession,
} from '../core/analyze-session';

describe('AnalyzeSession core contract', () => {
  it('summarizes synthetic CELL_CLICK style events deterministically', () => {
    const result = analyzeSession(syntheticCellClickSession);

    expect(AnalyzeSessionOutputSchema.safeParse(result).success).toBe(true);
    expect(result).toMatchObject({
      schemaVersion: 1,
      durationMs: 6_000,
      clickCount: 6,
      p50ReactionMs: 140,
      p95ReactionMs: 220,
      speedSlope: 22.8571,
      accuracy: 0.833,
      fatigueIndex: 0.5,
      engagementIndex: 0.745,
      suspiciousPatternScore: 0,
      recommendationSignals: ['recovery'],
    });
  });

  it('summarizes synthetic PracticeFlow style sessions for recommendation signals', () => {
    const result = analyzeSession(syntheticPracticeFlowSession);

    expect(result.clickCount).toBe(0);
    expect(result.p50ReactionMs).toBe(650);
    expect(result.p95ReactionMs).toBe(720);
    expect(result.speedSlope).toBeLessThan(0);
    expect(result.accuracy).toBe(1);
    expect(result.fatigueIndex).toBeLessThan(0);
    expect(result.engagementIndex).toBeGreaterThanOrEqual(0.68);
    expect(result.recommendationSignals).toEqual(['streak_maintenance']);
  });

  it('flags suspiciously fast and uniform sessions without identity data', () => {
    const result = analyzeSession(syntheticSuspiciousFastSession);

    expect(result.suspiciousPatternScore).toBe(1);
    expect(result.p50ReactionMs).toBe(49);
    expect(result.p95ReactionMs).toBe(50);
    expect(result.recommendationSignals).toEqual(['streak_maintenance']);
  });

  it('rejects identity, token, and raw storage material at the contract boundary', () => {
    expect(parseAnalyzeSessionInput({
      ...syntheticCellClickSession,
      brainId: 'synthetic-brain-id',
    }).success).toBe(false);

    expect(parseAnalyzeSessionInput({
      ...syntheticCellClickSession,
      events: [
        ...syntheticCellClickSession.events,
        { tMs: 7_000, kind: 'checkpoint', checkpoint: 'completed', token: 'synthetic-token' },
      ],
    }).success).toBe(false);

    expect(parseAnalyzeSessionInput({
      ...syntheticCellClickSession,
      metadata: { localStorage: '{}' },
    }).success).toBe(false);
  });
});
