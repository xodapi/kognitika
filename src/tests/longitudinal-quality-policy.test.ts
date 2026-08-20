import { describe, expect, it } from 'vitest';
import {
  resolveLongitudinalQuality,
  LONGITUDINAL_MAX_SUSPICIOUS_PATTERN_SCORE,
  LONGITUDINAL_QUALITY_POLICY_VERSION,
  type LongitudinalQualityInput,
} from '../lib/longitudinal-quality-policy.ts';

const completeInput = (): LongitudinalQualityInput => ({
  completed: true,
  eventCount: 3,
  suspiciousPatternScore: 0.2,
  accuracy: 0.8,
  reactionMs: 250,
});

describe('longitudinal quality policy', () => {
  it('uses the versioned inclusive production boundary', () => {
    expect(LONGITUDINAL_QUALITY_POLICY_VERSION).toBe('longitudinal-quality-policy-v1');
    expect(resolveLongitudinalQuality(
      { ...completeInput(), suspiciousPatternScore: LONGITUDINAL_MAX_SUSPICIOUS_PATTERN_SCORE },
      LONGITUDINAL_MAX_SUSPICIOUS_PATTERN_SCORE,
    )).toEqual({ eligible: true, reason: 'eligible' });
  });
  it.each([
    ['not_completed', { completed: false }],
    ['missing_or_empty_event_count', { eventCount: 0 }],
    ['missing_or_empty_event_count', { eventCount: 1.5 }],
    ['missing_or_invalid_suspicious_score', { suspiciousPatternScore: Number.NaN }],
    ['missing_or_invalid_suspicious_score', { suspiciousPatternScore: 1.1 }],
    ['score_exceeds_policy', { suspiciousPatternScore: 0.21 }],
    ['missing_or_invalid_accuracy', { accuracy: -0.1 }],
    ['missing_or_invalid_accuracy', { accuracy: Number.POSITIVE_INFINITY }],
    ['missing_or_invalid_reaction_ms', { reactionMs: -1 }],
    ['missing_or_invalid_reaction_ms', { reactionMs: Number.NaN }],
  ] as const)('returns %s for invalid data', (reason, patch) => {
    expect(resolveLongitudinalQuality({ ...completeInput(), ...patch }, 0.2))
      .toEqual({ eligible: false, reason });
  });

  it('keeps scores at the threshold eligible and excludes only greater scores', () => {
    expect(resolveLongitudinalQuality(completeInput(), 0.2))
      .toEqual({ eligible: true, reason: 'eligible' });
    expect(resolveLongitudinalQuality({ ...completeInput(), suspiciousPatternScore: 0.200001 }, 0.2))
      .toEqual({ eligible: false, reason: 'score_exceeds_policy' });
  });

  it.each([Number.NaN, Number.NEGATIVE_INFINITY, -0.01, 1.01])(
    'requires a finite threshold in the unit interval',
    (threshold) => {
      expect(() => resolveLongitudinalQuality(completeInput(), threshold))
        .toThrow(/maxSuspiciousPatternScore/);
    },
  );

  it('returns only a privacy-preserving data-quality outcome', () => {
    const callerInput: unknown = {
      ...completeInput(),
      sessionId: 'synthetic-session-only-input',
      brainId: 'synthetic-private-input',
      rawTelemetry: [{ latency: 250 }],
    };
    const result = resolveLongitudinalQuality(callerInput as LongitudinalQualityInput, 0.2);

    expect(result).toEqual({ eligible: true, reason: 'eligible' });
    expect(Object.keys(result)).toEqual(['eligible', 'reason']);
    expect(JSON.stringify(result)).not.toMatch(/session|brain|telemetry|diagnos|fraud|effort|clinical|cognitive/i);
  });
});
