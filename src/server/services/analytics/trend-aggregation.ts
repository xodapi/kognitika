import type { TrendPoint } from '../../../lib/cognitive-trend-types.ts';
import type { AnalyticsSummaryRow } from '../../repositories/analytics-summary-repository.ts';

export function aggregateAnalyticsTrend(rows: AnalyticsSummaryRow[]): TrendPoint[] {
  const grouped = new Map<string, {
    accuracy: number;
    reactionMs: number;
    fatigueIndex: number;
    engagementIndex: number;
    count: number;
  }>();

  for (const row of rows) {
    const day = row.createdAt.toISOString().slice(0, 10);
    const current = grouped.get(day) ?? {
      accuracy: 0,
      reactionMs: 0,
      fatigueIndex: 0,
      engagementIndex: 0,
      count: 0,
    };
    current.accuracy += row.accuracy;
    current.reactionMs += row.p50ReactionMs;
    current.fatigueIndex += row.fatigueIndex;
    current.engagementIndex += row.engagementIndex;
    current.count += 1;
    grouped.set(day, current);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date,
      accuracy: value.accuracy / value.count,
      reactionMs: Math.round(value.reactionMs / value.count),
      fatigueIndex: value.fatigueIndex / value.count,
      engagementIndex: value.engagementIndex / value.count,
      sessionCount: value.count,
    }));
}
