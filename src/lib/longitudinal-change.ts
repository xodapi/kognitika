/**
 * Identity-free comparison of one training metric against a personal
 * historical baseline. This is a statistical projection, not a diagnosis,
 * capability score, or recommendation.
 */
export const LONGITUDINAL_CHANGE_VERSION = 'longitudinal-change-v1' as const;
export const MIN_BASELINE_SAMPLES = 3;

export type LongitudinalChange = Readonly<{
  version: typeof LONGITUDINAL_CHANGE_VERSION;
  status: 'ready' | 'insufficient_data';
  baselineSampleCount: number;
  currentSampleCount: number;
  baselineMedian: number | null;
  currentMedian: number | null;
  absoluteChange: number | null;
  normalizedChange: number | null;
  uncertainty: number | null;
}>;

/**
 * Computes a robust median-based change. `scaleFloor` must be chosen per
 * metric/stratum by a reviewed caller, preventing divisions by zero while
 * avoiding cross-metric normalization.
 */
export function summarizeLongitudinalChange(
  baselineValues: readonly number[],
  currentValues: readonly number[],
  scaleFloor: number,
): LongitudinalChange {
  if (!Number.isFinite(scaleFloor) || scaleFloor <= 0) {
    throw new RangeError('scaleFloor must be a positive finite number');
  }

  const baseline = baselineValues.filter(Number.isFinite);
  const current = currentValues.filter(Number.isFinite);
  if (baseline.length < MIN_BASELINE_SAMPLES || current.length < MIN_BASELINE_SAMPLES) {
    return insufficient(baseline.length, current.length);
  }

  const baselineMedian = median(baseline);
  const currentMedian = median(current);
  const absoluteChange = currentMedian - baselineMedian;
  const baselineMad = median(baseline.map((value) => Math.abs(value - baselineMedian)));
  const robustScale = Math.max(baselineMad * 1.4826, scaleFloor);

  return {
    version: LONGITUDINAL_CHANGE_VERSION,
    status: 'ready',
    baselineSampleCount: baseline.length,
    currentSampleCount: current.length,
    baselineMedian: round(baselineMedian),
    currentMedian: round(currentMedian),
    absoluteChange: round(absoluteChange),
    normalizedChange: round(absoluteChange / robustScale),
    uncertainty: round(robustScale / Math.sqrt(current.length)),
  };
}

function insufficient(baselineSampleCount: number, currentSampleCount: number): LongitudinalChange {
  return {
    version: LONGITUDINAL_CHANGE_VERSION,
    status: 'insufficient_data',
    baselineSampleCount,
    currentSampleCount,
    baselineMedian: null,
    currentMedian: null,
    absoluteChange: null,
    normalizedChange: null,
    uncertainty: null,
  };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}
