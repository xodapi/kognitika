import { describe, expect, it } from 'vitest';
import {
  PHYSIOLOGICAL_SESSION_SUMMARY_VERSION,
  isPhysiologicalSummaryUsable,
  parsePhysiologicalSessionSummary,
} from '../core/physiological-summary/index.ts';

const generatedAt = '2026-08-17T12:00:00.000Z';
const validSummary = {
  schemaVersion: PHYSIOLOGICAL_SESSION_SUMMARY_VERSION,
  summaryId: 'physio-summary-synthetic-1',
  cognitiveSessionId: 'cognitive-session-synthetic-1',
  capability: 'heart_rate',
  capabilityVersion: 'platform-aggregate-v1',
  availability: 'available',
  confidence: 0.9,
  generatedAt,
  window: {
    startedAt: '2026-08-17T11:55:00.000Z',
    endedAt: generatedAt,
  },
  aggregation: 'platform_median',
  measurements: { medianHeartRateBpm: 72 },
} as const;

describe('physiological session summary contract', () => {
  it('accepts a bounded, versioned aggregate-only summary', () => {
    expect(parsePhysiologicalSessionSummary(validSummary)).toEqual({
      success: true,
      data: validSummary,
    });
  });

  it.each(['unavailable', 'revoked', 'stale', 'low_quality', 'conflicting'] as const)(
    '%s summaries have no measurements and are unusable',
    (availability) => {
      const parsed = parsePhysiologicalSessionSummary({
        ...validSummary,
        availability,
        confidence: 0,
        aggregation: 'not_available',
        measurements: {},
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(isPhysiologicalSummaryUsable(parsed.data, new Date(generatedAt))).toBe(false);
      }
    },
  );

  it('treats an old available summary as stale', () => {
    const parsed = parsePhysiologicalSessionSummary(validSummary);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isPhysiologicalSummaryUsable(parsed.data, new Date('2026-08-17T12:15:00.001Z'))).toBe(false);
    }
  });

  it.each([
    ['low confidence available measurement', { ...validSummary, confidence: 0.69 }],
    ['measurements on revoked input', {
      ...validSummary,
      availability: 'revoked',
      confidence: 0,
      aggregation: 'not_available',
    }],
    ['window longer than two hours', {
      ...validSummary,
      window: { startedAt: '2026-08-17T09:59:59.999Z', endedAt: generatedAt },
    }],
    ['raw telemetry', { ...validSummary, rawTelemetry: [72, 73] }],
    ['device identifier', { ...validSummary, deviceId: 'synthetic-device' }],
    ['identity field', { ...validSummary, brainId: 'synthetic-brain-id' }],
  ])('rejects %s', (_label, input) => {
    expect(parsePhysiologicalSessionSummary(input).success).toBe(false);
  });
});
