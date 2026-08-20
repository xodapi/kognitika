import {
  aggregateQualityFilteredLongitudinalAnalytics,
  type QualityFilteredLongitudinalAnalytics,
} from '../../../lib/longitudinal-analytics.ts';
import {
  LONGITUDINAL_MAX_SUSPICIOUS_PATTERN_SCORE,
  LONGITUDINAL_QUALITY_POLICY_VERSION,
} from '../../../lib/longitudinal-quality-policy.ts';
import { LONGITUDINAL_STRATA_POLICY_VERSION } from '../../../lib/longitudinal-strata.ts';
import type {
  LongitudinalStrataProjectionRepository,
} from '../../repositories/longitudinal-observation-repository.ts';
import type { Clock } from './longitudinal-analytics.ts';

export type LongitudinalStrataProjectionResponse = {
  version: 'longitudinal-strata-projection-v1';
  policyVersion: {
    strata: typeof LONGITUDINAL_STRATA_POLICY_VERSION;
    quality: typeof LONGITUDINAL_QUALITY_POLICY_VERSION;
  };
  asOf: Date;
  exclusions: Record<string, number>;
  strata: Array<{
    moduleId: string;
    moduleVersion: string;
    difficulty: string;
    label: string;
    analytics: QualityFilteredLongitudinalAnalytics;
  }>;
};

export class LongitudinalStrataProjectionService {
  constructor(
    private readonly repository: LongitudinalStrataProjectionRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async getProjection(userId: string, moduleId: string): Promise<LongitudinalStrataProjectionResponse> {
    const asOf = this.clock();
    const from = new Date(asOf.getTime() - 90 * 24 * 60 * 60 * 1000);
    const projection = await this.repository.findLongitudinalStrataProjection(userId, moduleId, from, asOf);
    const byStratum = new Map<string, typeof projection.rows>();
    for (const row of projection.rows) {
      const key = JSON.stringify(row.stratum);
      const rows = byStratum.get(key) ?? [];
      rows.push(row);
      byStratum.set(key, rows);
    }
    return {
      version: 'longitudinal-strata-projection-v1',
      policyVersion: {
        strata: LONGITUDINAL_STRATA_POLICY_VERSION,
        quality: LONGITUDINAL_QUALITY_POLICY_VERSION,
      },
      asOf,
      exclusions: projection.exclusions,
      strata: [...byStratum.values()].map((rows) => ({
        ...rows[0].stratum,
        analytics: aggregateQualityFilteredLongitudinalAnalytics(rows, asOf, LONGITUDINAL_MAX_SUSPICIOUS_PATTERN_SCORE),
      })),
    };
  }
}
