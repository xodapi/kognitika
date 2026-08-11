import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import type { SessionAnalyticsSummaryRecord } from '../../core/analyze-session/index.ts';
import type { CognitiveTrend, TrendPoint } from '../../lib/cognitive-trend-types.ts';
import { assertSafeAnalyticsSummary } from './analytics-summary-policy.ts';
import { getAnalyticsRepositories } from '../infrastructure/container.ts';

const logger = createSafeLogger('analytics-persistence');

export async function persistSessionAnalyticsSummary(
  userId: string,
  record: SessionAnalyticsSummaryRecord,
): Promise<void> {
  try {
    assertSafeAnalyticsSummary(record);
  } catch (error) {
    logger.warn('Analytics summary rejected', { error: safeError(error), jobId: record.jobId });
    throw error;
  }

  try {
    await getAnalyticsRepositories().summaries.upsert(userId, record);
  } catch (err) {
    logger.error('Failed to persist analytics summary', { error: safeError(err), jobId: record.jobId });
    throw err;
  }
}

export interface SummaryQueryParams {
  userId: string;
  moduleId?: string;
  category?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export async function getSessionAnalyticsSummaries(
  params: SummaryQueryParams,
) {
  const { userId, moduleId, category, from, to, limit = 100 } = params;

  return getAnalyticsRepositories().summaries.findSummaries({
    userId,
    moduleId,
    category,
    from,
    to,
    limit,
  });
}

export async function getModuleTrendData(
  userId: string,
  moduleId: string,
  days: number,
): Promise<TrendPoint[]> {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const summaries = await getAnalyticsRepositories().summaries.findTrendRows(userId, moduleId, from);

  return aggregateByDay(summaries);
}

export async function getAggregateTrendData(
  userId: string,
  days: number,
): Promise<TrendPoint[]> {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const summaries = await getAnalyticsRepositories().summaries.findTrendRows(userId, null, from);

  return aggregateByDay(summaries);
}

function aggregateByDay(
  summaries: Array<{
    createdAt: Date;
    accuracy: number;
    p50ReactionMs: number;
    fatigueIndex: number;
    engagementIndex: number;
  }>,
): TrendPoint[] {
  const grouped: Record<
    string,
    {
      accuracy: number;
      reactionMs: number;
      fatigueIndex: number;
      engagementIndex: number;
      count: number;
    }
  > = {};

  for (const s of summaries) {
    const day = s.createdAt.toISOString().slice(0, 10);
    if (!grouped[day]) {
      grouped[day] = { accuracy: 0, reactionMs: 0, fatigueIndex: 0, engagementIndex: 0, count: 0 };
    }
    const g = grouped[day];
    g.accuracy += s.accuracy;
    g.reactionMs += s.p50ReactionMs;
    g.fatigueIndex += s.fatigueIndex;
    g.engagementIndex += s.engagementIndex;
    g.count += 1;
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, g]) => ({
      date,
      accuracy: g.accuracy / g.count,
      reactionMs: Math.round(g.reactionMs / g.count),
      fatigueIndex: g.fatigueIndex / g.count,
      engagementIndex: g.engagementIndex / g.count,
      sessionCount: g.count,
    }));
}

export async function computeCognitiveTrend(
  userId: string,
  moduleId: string | null,
  days: number,
): Promise<CognitiveTrend> {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const summaries = await getAnalyticsRepositories().summaries.findTrendRows(userId, moduleId, from);

  const points = aggregateByDay(summaries);

  const totalSessions = points.reduce((sum, p) => sum + p.sessionCount, 0);
  const avgAccuracy = totalSessions > 0
    ? points.reduce((sum, p) => sum + p.accuracy * p.sessionCount, 0) / totalSessions
    : 0;
  const avgReactionMs = totalSessions > 0
    ? Math.round(points.reduce((sum, p) => sum + p.reactionMs * p.sessionCount, 0) / totalSessions)
    : 0;

  const overallDirection = detectDirection(points);

  return {
    moduleId,
    category: null,
    points,
    overallDirection,
    timespanDays: days,
    summary: {
      avgAccuracy: Math.round(avgAccuracy * 1000) / 1000,
      avgReactionMs,
      totalSessions,
    },
  };
}

function detectDirection(points: TrendPoint[]): 'improving' | 'stable' | 'declining' {
  if (points.length < 2) return 'stable';

  const half = Math.floor(points.length / 2);
  const firstHalf = points.slice(0, half);
  const secondHalf = points.slice(half);

  const firstAvgAccuracy = firstHalf.reduce((s, p) => s + p.accuracy, 0) / firstHalf.length;
  const secondAvgAccuracy = secondHalf.reduce((s, p) => s + p.accuracy, 0) / secondHalf.length;

  const delta = secondAvgAccuracy - firstAvgAccuracy;

  if (delta > 0.03) return 'improving';
  if (delta < -0.03) return 'declining';
  return 'stable';
}
