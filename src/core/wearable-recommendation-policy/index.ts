import { z } from 'zod';
import {
  isPhysiologicalSummaryUsable,
  PhysiologicalSessionSummarySchema,
} from '../physiological-summary/index.ts';

export const WEARABLE_RECOMMENDATION_POLICY_VERSION = 1 as const;
export const WEARABLE_RECOMMENDATION_COOLDOWN_MS = 1_800_000 as const;

export const WearableRecommendationOutcomeSchema = z.enum([
  'keep',
  'soften_next_block',
  'pause_suggested',
  'recovery_suggested',
  'increase_next_block',
]);
export type WearableRecommendationOutcome = z.infer<typeof WearableRecommendationOutcomeSchema>;

export const WearableRecommendationReasonSchema = z.enum([
  'cognitive_baseline',
  'cognitive_low_accuracy',
  'cognitive_fatigue',
  'wearable_unavailable',
  'wearable_low_quality',
  'wearable_stale',
  'wearable_conflicting',
  'wearable_corroborates_cognitive_fatigue',
]);
export type WearableRecommendationReason = z.infer<typeof WearableRecommendationReasonSchema>;

export const WearableRecommendationPolicyInputSchema = z.object({
  policyVersion: z.literal(WEARABLE_RECOMMENDATION_POLICY_VERSION),
  cognitive: z.object({
    accuracy: z.number().finite().min(0).max(1),
    fatigueIndex: z.number().finite().min(-1).max(1),
    durationMs: z.number().int().nonnegative().max(2 * 60 * 60 * 1_000),
  }).strict(),
  userSettings: z.object({
    wearableRecommendationsOptIn: z.boolean(),
  }).strict(),
  physiologicalSummary: PhysiologicalSessionSummarySchema.optional(),
}).strict();
export type WearableRecommendationPolicyInput = z.infer<typeof WearableRecommendationPolicyInputSchema>;

export const WearableRecommendationPolicyDecisionSchema = z.object({
  policyVersion: z.literal(WEARABLE_RECOMMENDATION_POLICY_VERSION),
  mode: z.literal('shadow'),
  baselineOutcome: WearableRecommendationOutcomeSchema,
  shadowOutcome: WearableRecommendationOutcomeSchema,
  reason: WearableRecommendationReasonSchema,
  wearableUsed: z.boolean(),
  cooldownMs: z.literal(WEARABLE_RECOMMENDATION_COOLDOWN_MS),
  circuitBreaker: z.object({
    enabled: z.literal(false),
    rollbackCondition: z.literal('set wearable shadow policy enabled to false'),
  }).strict(),
}).strict();
export type WearableRecommendationPolicyDecision = z.infer<typeof WearableRecommendationPolicyDecisionSchema>;

function cognitiveBaseline(input: WearableRecommendationPolicyInput): WearableRecommendationOutcome {
  if (input.cognitive.accuracy < 0.6 && input.cognitive.fatigueIndex >= 0.25) return 'pause_suggested';
  if (input.cognitive.fatigueIndex >= 0.2) return 'recovery_suggested';
  if (input.cognitive.accuracy < 0.7) return 'soften_next_block';
  if (input.cognitive.accuracy >= 0.92 && input.cognitive.fatigueIndex <= 0.05) return 'increase_next_block';
  return 'keep';
}

function unavailableReason(input: WearableRecommendationPolicyInput): WearableRecommendationReason {
  const summary = input.physiologicalSummary;
  if (!summary) return 'wearable_unavailable';
  if (summary.availability === 'low_quality') return 'wearable_low_quality';
  if (summary.availability === 'stale') return 'wearable_stale';
  if (summary.availability === 'conflicting') return 'wearable_conflicting';
  return 'wearable_unavailable';
}

/**
 * Pure, default-off shadow policy. Physiological input can only corroborate an
 * existing cognitive fatigue outcome. It cannot independently change a plan.
 */
export function evaluateWearableRecommendationShadow(
  rawInput: WearableRecommendationPolicyInput,
  now = new Date(),
): WearableRecommendationPolicyDecision {
  const input = WearableRecommendationPolicyInputSchema.parse(rawInput);
  const baselineOutcome = cognitiveBaseline(input);
  const base = {
    policyVersion: WEARABLE_RECOMMENDATION_POLICY_VERSION,
    mode: 'shadow' as const,
    baselineOutcome,
    cooldownMs: WEARABLE_RECOMMENDATION_COOLDOWN_MS,
    circuitBreaker: {
      enabled: false as const,
      rollbackCondition: 'set wearable shadow policy enabled to false' as const,
    },
  };

  if (!input.userSettings.wearableRecommendationsOptIn || !input.physiologicalSummary) {
    return WearableRecommendationPolicyDecisionSchema.parse({
      ...base,
      shadowOutcome: baselineOutcome,
      reason: 'wearable_unavailable',
      wearableUsed: false,
    });
  }

  if (!isPhysiologicalSummaryUsable(input.physiologicalSummary, now)) {
    return WearableRecommendationPolicyDecisionSchema.parse({
      ...base,
      shadowOutcome: baselineOutcome,
      reason: unavailableReason(input),
      wearableUsed: false,
    });
  }

  const cognitiveFatigue = baselineOutcome === 'pause_suggested'
    || baselineOutcome === 'recovery_suggested';
  if (!cognitiveFatigue) {
    return WearableRecommendationPolicyDecisionSchema.parse({
      ...base,
      shadowOutcome: baselineOutcome,
      reason: 'cognitive_baseline',
      wearableUsed: false,
    });
  }

  return WearableRecommendationPolicyDecisionSchema.parse({
    ...base,
    shadowOutcome: baselineOutcome,
    reason: 'wearable_corroborates_cognitive_fatigue',
    wearableUsed: true,
  });
}
