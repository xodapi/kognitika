import type { CognitiveTrend } from '../../../lib/cognitive-trend-types.ts';
import type { AnalyticsSummaryRepository } from '../../repositories/analytics-summary-repository.ts';
import { aggregateAnalyticsTrend } from './trend-aggregation.ts';

export type CognitiveTrendInput = {
  userId: string;
  moduleId?: string;
  days: number;
};

export class CognitiveTrendService {
  constructor(private readonly summaries: AnalyticsSummaryRepository) {}

  async getCognitiveTrend(input: CognitiveTrendInput): Promise<CognitiveTrend> {
    const from = new Date();
    from.setDate(from.getDate() - input.days);
    const rows = await this.summaries.findTrendRows(input.userId, input.moduleId ?? null, from);
    const points = aggregateAnalyticsTrend(rows);
    const totalSessions = points.reduce((sum, point) => sum + point.sessionCount, 0);
    const avgAccuracy = totalSessions > 0
      ? points.reduce((sum, point) => sum + point.accuracy * point.sessionCount, 0) / totalSessions
      : 0;
    const avgReactionMs = totalSessions > 0
      ? Math.round(points.reduce((sum, point) => sum + point.reactionMs * point.sessionCount, 0) / totalSessions)
      : 0;

    return {
      moduleId: input.moduleId ?? null,
      category: null,
      points,
      overallDirection: detectDirection(points),
      timespanDays: input.days,
      summary: {
        avgAccuracy: Math.round(avgAccuracy * 1000) / 1000,
        avgReactionMs,
        totalSessions,
      },
    };
  }
}

function detectDirection(
  points: Array<{ accuracy: number }>,
): 'improving' | 'stable' | 'declining' {
  if (points.length < 2) return 'stable';
  const half = Math.floor(points.length / 2);
  const first = points.slice(0, half);
  const second = points.slice(half);
  const firstAverage = first.reduce((sum, point) => sum + point.accuracy, 0) / first.length;
  const secondAverage = second.reduce((sum, point) => sum + point.accuracy, 0) / second.length;
  const delta = secondAverage - firstAverage;
  if (delta > 0.03) return 'improving';
  if (delta < -0.03) return 'declining';
  return 'stable';
}
