import {
  aggregateLongitudinalAnalytics,
  type LongitudinalAnalytics,
} from '../../../lib/longitudinal-analytics.ts';
import type { LongitudinalObservationRepository } from '../../repositories/longitudinal-observation-repository.ts';

export type Clock = () => Date;

export class LongitudinalAnalyticsService {
  constructor(
    private readonly observations: LongitudinalObservationRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async getLongitudinalAnalytics(userId: string, moduleId: string): Promise<LongitudinalAnalytics> {
    const asOf = this.clock();
    const from = new Date(asOf.getTime() - 90 * 24 * 60 * 60 * 1000);
    const rows = await this.observations.findLongitudinalObservations(userId, moduleId, from, asOf);
    return aggregateLongitudinalAnalytics(rows.map(({ occurredAt, accuracy, reactionMs }) => ({
      occurredAt,
      accuracy,
      reactionMs,
    })), asOf);
  }
}
