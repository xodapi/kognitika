/**
 * Pure, identity-free data-quality eligibility for a future longitudinal
 * projection. It neither persists nor interprets the supplied measurements.
 */
export type LongitudinalQualityInput = Readonly<{
  completed?: unknown;
  eventCount?: unknown;
  suspiciousPatternScore?: unknown;
  accuracy?: unknown;
  reactionMs?: unknown;
}>;

export type LongitudinalQualityReason =
  | 'not_completed'
  | 'missing_or_empty_event_count'
  | 'missing_or_invalid_suspicious_score'
  | 'score_exceeds_policy'
  | 'missing_or_invalid_accuracy'
  | 'missing_or_invalid_reaction_ms'
  | 'eligible';

export type LongitudinalQualityResolution = Readonly<{
  eligible: boolean;
  reason: LongitudinalQualityReason;
}>;

/** Private, versioned production configuration; its numeric value is never transported. */
export const LONGITUDINAL_QUALITY_POLICY_VERSION = 'longitudinal-quality-policy-v1' as const;
export const LONGITUDINAL_MAX_SUSPICIOUS_PATTERN_SCORE = 1.0 as const;

const INELIGIBLE = (
  reason: Exclude<LongitudinalQualityReason, 'eligible'>,
): LongitudinalQualityResolution => ({ eligible: false, reason });

/**
 * Resolves whether one completed measurement has the minimum data quality for
 * a future longitudinal projection. The supplied threshold is inclusive:
 * scores equal to it remain eligible.
 */
export function resolveLongitudinalQuality(
  input: LongitudinalQualityInput,
  maxSuspiciousPatternScore: number,
): LongitudinalQualityResolution {
  assertValidThreshold(maxSuspiciousPatternScore);

  if (input.completed !== true) return INELIGIBLE('not_completed');
  if (!isPositiveInteger(input.eventCount)) return INELIGIBLE('missing_or_empty_event_count');
  if (!isUnitInterval(input.suspiciousPatternScore)) return INELIGIBLE('missing_or_invalid_suspicious_score');
  if (input.suspiciousPatternScore > maxSuspiciousPatternScore) return INELIGIBLE('score_exceeds_policy');
  if (!isUnitInterval(input.accuracy)) return INELIGIBLE('missing_or_invalid_accuracy');
  if (!isNonnegativeFinite(input.reactionMs)) return INELIGIBLE('missing_or_invalid_reaction_ms');

  return { eligible: true, reason: 'eligible' };
}

function assertValidThreshold(value: number): void {
  if (!isUnitInterval(value)) {
    throw new RangeError('maxSuspiciousPatternScore must be a finite number from 0 to 1');
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isUnitInterval(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= 1;
}

function isNonnegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
