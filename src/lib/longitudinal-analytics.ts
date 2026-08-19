/**
 * Versioned, identity-free longitudinal analytics contract.
 *
 * This is deliberately a pure core: persistence, user identity, and transport
 * adapters should map into these records rather than being coupled to it.
 */
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

const MIN_SESSIONS = 3;

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

function isValidObservation(row: LongitudinalObservation): boolean {
  return row.occurredAt instanceof Date
    && Number.isFinite(row.occurredAt.getTime())
    && Number.isFinite(row.accuracy)
    && row.accuracy >= 0
    && row.accuracy <= 1
    && Number.isFinite(row.reactionMs)
    && row.reactionMs >= 0;
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
