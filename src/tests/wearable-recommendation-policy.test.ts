import { describe, expect, it } from 'vitest';
import {
  evaluateWearableRecommendationShadow,
  WEARABLE_RECOMMENDATION_POLICY_VERSION,
} from '../core/wearable-recommendation-policy/index.ts';
import { PHYSIOLOGICAL_SESSION_SUMMARY_VERSION } from '../core/physiological-summary/index.ts';

const now = new Date('2026-08-17T12:00:00.000Z');
const usableSummary = {
  schemaVersion: PHYSIOLOGICAL_SESSION_SUMMARY_VERSION,
  summaryId: 'physio-summary-policy-synthetic',
  cognitiveSessionId: 'cognitive-session-policy-synthetic',
  capability: 'heart_rate',
  capabilityVersion: 'platform-aggregate-v1',
  availability: 'available',
  confidence: 0.9,
  generatedAt: now.toISOString(),
  window: { startedAt: '2026-08-17T11:55:00.000Z', endedAt: now.toISOString() },
  aggregation: 'platform_median',
  measurements: { medianHeartRateBpm: 72 },
} as const;

function policyInput(overrides: Record<string, unknown> = {}) {
  return {
    policyVersion: WEARABLE_RECOMMENDATION_POLICY_VERSION,
    cognitive: { accuracy: 0.85, fatigueIndex: 0, durationMs: 60_000 },
    userSettings: { wearableRecommendationsOptIn: true },
    physiologicalSummary: usableSummary,
    ...overrides,
  };
}

describe('wearable recommendation shadow policy', () => {
  it('is shadow-only, reproducible, and does not change a cognitive baseline from wearable input alone', () => {
    const result = evaluateWearableRecommendationShadow(policyInput(), now);
    expect(result).toMatchObject({
      mode: 'shadow',
      baselineOutcome: 'keep',
      shadowOutcome: 'keep',
      wearableUsed: false,
      reason: 'cognitive_baseline',
      cooldownMs: 1_800_000,
    });
  });

  it('uses wearable input only to corroborate existing cognitive fatigue', () => {
    const result = evaluateWearableRecommendationShadow(policyInput({
      cognitive: { accuracy: 0.8, fatigueIndex: 0.3, durationMs: 60_000 },
    }), now);
    expect(result).toMatchObject({
      baselineOutcome: 'recovery_suggested',
      shadowOutcome: 'recovery_suggested',
      wearableUsed: true,
      reason: 'wearable_corroborates_cognitive_fatigue',
    });
  });

  it.each([
    ['opted out', { userSettings: { wearableRecommendationsOptIn: false } }, 'wearable_unavailable'],
    ['revoked', {
      physiologicalSummary: {
        ...usableSummary, availability: 'revoked', confidence: 0, aggregation: 'not_available', measurements: {},
      },
    }, 'wearable_unavailable'],
    ['low quality', {
      physiologicalSummary: {
        ...usableSummary, availability: 'low_quality', confidence: 0, aggregation: 'not_available', measurements: {},
      },
    }, 'wearable_low_quality'],
    ['conflicting', {
      physiologicalSummary: {
        ...usableSummary, availability: 'conflicting', confidence: 0, aggregation: 'not_available', measurements: {},
      },
    }, 'wearable_conflicting'],
  ])('%s wearable input follows cognitive-only fallback', (_label, override, reason) => {
    const result = evaluateWearableRecommendationShadow(policyInput({
      cognitive: { accuracy: 0.65, fatigueIndex: 0, durationMs: 60_000 },
      ...override,
    }), now);
    expect(result).toMatchObject({
      baselineOutcome: 'soften_next_block',
      shadowOutcome: 'soften_next_block',
      wearableUsed: false,
      reason,
    });
  });
});
