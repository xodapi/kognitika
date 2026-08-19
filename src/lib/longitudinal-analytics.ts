/**
 * Versioned, identity-free longitudinal analytics contract.
 *
 * This is deliberately a pure core: persistence, user identity, and transport
 * adapters should map into these records rather than being coupled to it.
 */
import {
  resolveLongitudinalQuality,
  type LongitudinalQualityReason,
} from './longitudinal-quality-policy.ts';

export const LONGITUDINAL_ANALYTICS_VERSION = 'longitudinal-analytics-v1' as const;
export const LONGITUDINAL_WINDOWS_DAYS = [7, 30, 90] as const;

export type LongitudinalObservation = {
  occurredAt: Date;
  accuracy: number;
  reactionMs: number;
};

export type LongitudinalWindow = {
  days: number;
  status: 'ready' | 'insufficient_data';
  sessionCount: number;
  coverage: {
    observedDays: number;
    proportion: number;
  };
  accuracy: {
    mean: number | null;
    standardError: number | null;
  };
  speed: {
    meanReactionMs: number | null;
    standardErrorMs: number | null;
  };
};

export type LongitudinalAnalytics = {
  version: typeof LONGITUDINAL_ANALYTICS_VERSION;
  asOf: Date;
  windows: LongitudinalWindow[];
};

export type LongitudinalQualityObservation = Readonly<{
  occurredAt: Date;
  completed?: unknown;
  eventCount?: unknown;
  suspiciousPatternScore?: unknown;
  accuracy?: unknown;
  reactionMs?: unknown;
}>;

export type LongitudinalQualityExclusionReason = Exclude<LongitudinalQualityReason, 'eligible'>;

export type LongitudinalQualityCounters = Readonly<{
  denominator: number;
  eligibleCount: number;
  excludedCount: number;
  exclusions: Readonly<Record<LongitudinalQualityExclusionReason, number>>;
}>;

export type QualityFilteredLongitudinalWindow = LongitudinalWindow & {
  quality: LongitudinalQualityCounters;
};

export type QualityFilteredLongitudinalAnalytics = Omit<LongitudinalAnalytics, 'windows'> & {
  windows: QualityFilteredLongitudinalWindow[];
};

const MIN_SESSIONS = 3;
const QUALITY_EXCLUSION_REASONS: readonly LongitudinalQualityExclusionReason[] = [
  'not_completed',
  'missing_or_empty_event_count',
  'missing_or_invalid_suspicious_score',
  'score_exceeds_policy',
  'missing_or_invalid_accuracy',
  'missing_or_invalid_reaction_ms',
];

export function aggregateLongitudinalAnalytics(
  observations: readonly LongitudinalObservation[],
  asOf: Date,
): LongitudinalAnalytics {
  const asOfTime = asOf.getTime();
  if (!Number.isFinite(asOfTime)) throw new Error('asOf must be a valid date');
  const validObservations = observations.filter(isValidObservation);

  const windows: LongitudinalWindow[] = LONGITUDINAL_WINDOWS_DAYS.map((days) => {
    const cutoff = asOfTime - days * 24 * 60 * 60 * 1000;
    const rows = validObservations.filter((row) => {
      const time = row.occurredAt.getTime();
      return time >= cutoff && time <= asOfTime;
    });
    const sessionCount = rows.length;
    const observedDays = new Set(rows.map((row) => row.occurredAt.toISOString().slice(0, 10))).size;
    const ready = sessionCount >= MIN_SESSIONS;
    return {
      days,
      status: ready ? 'ready' : 'insufficient_data',
      sessionCount,
      coverage: {
        observedDays,
        proportion: round(observedDays / days),
      },
      accuracy: ready ? metric(rows.map((row) => row.accuracy)) : emptyMetric(),
      speed: ready ? {
        meanReactionMs: round(mean(rows.map((row) => row.reactionMs))),
        standardErrorMs: round(standardError(rows.map((row) => row.reactionMs))),
      } : { meanReactionMs: null, standardErrorMs: null },
    };
  });

  return { version: LONGITUDINAL_ANALYTICS_VERSION, asOf, windows };
}

/**
 * Produces a quality-aware projection without changing the legacy aggregate
 * contract. Quality exclusions are counts only, never identity or telemetry.
 */
export function aggregateQualityFilteredLongitudinalAnalytics(
  observations: readonly LongitudinalQualityObservation[],
  asOf: Date,
  maxSuspiciousPatternScore: number,
): QualityFilteredLongitudinalAnalytics {
  const asOfTime = asOf.getTime();
  if (!Number.isFinite(asOfTime)) throw new Error('asOf must be a valid date');

  const temporalObservations = observations.filter((row) => (
    row.occurredAt instanceof Date
    && Number.isFinite(row.occurredAt.getTime())
    && row.occurredAt.getTime() <= asOfTime
  ));

  const windows = LONGITUDINAL_WINDOWS_DAYS.map((days) => {
    const cutoff = asOfTime - days * 24 * 60 * 60 * 1000;
    const rows = temporalObservations.filter((row) => row.occurredAt.getTime() >= cutoff);
    const exclusions = emptyExclusions();
    const eligibleRows: LongitudinalObservation[] = [];

    for (const row of rows) {
      const quality = resolveLongitudinalQuality(row, maxSuspiciousPatternScore);
      if (!quality.eligible) {
        exclusions[quality.reason as LongitudinalQualityExclusionReason] += 1;
        continue;
      }
      eligibleRows.push({
        occurredAt: row.occurredAt,
        accuracy: row.accuracy as number,
        reactionMs: row.reactionMs as number,
      });
    }

    const aggregate = aggregateLongitudinalAnalytics(eligibleRows, asOf).windows
      .find((window) => window.days === days)!;
    const excludedCount = rows.length - eligibleRows.length;
    return {
      ...aggregate,
      quality: {
        denominator: rows.length,
        eligibleCount: eligibleRows.length,
        excludedCount,
        exclusions,
      },
    };
  });

  return { version: LONGITUDINAL_ANALYTICS_VERSION, asOf, windows };
}

function isValidObservation(row: LongitudinalObservation): boolean {
  return row.occurredAt instanceof Date
    && Number.isFinite(row.occurredAt.getTime())
    && Number.isFinite(row.accuracy)
    && row.accuracy >= 0
    && row.accuracy <= 1
    && Number.isFinite(row.reactionMs)
    && row.reactionMs >= 0;
}

function emptyExclusions(): Record<LongitudinalQualityExclusionReason, number> {
  return Object.fromEntries(QUALITY_EXCLUSION_REASONS.map((reason) => [reason, 0])) as Record<
    LongitudinalQualityExclusionReason,
    number
  >;
}

function emptyMetric() {
  return { mean: null, standardError: null };
}

function metric(values: number[]) {
  return { mean: round(mean(values)), standardError: round(standardError(values)) };
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardError(values: number[]) {
  if (values.length < 2) return 0;
  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance / values.length);
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
