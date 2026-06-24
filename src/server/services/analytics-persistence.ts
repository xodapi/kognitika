import prisma from '../../lib/prisma.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import {
  SessionAnalyticsSummaryRecordSchema,
  type SessionAnalyticsSummaryRecord,
} from '../../core/analyze-session/index.ts';
import type { CognitiveTrend, TrendPoint } from '../../lib/cognitive-trend-types.ts';
import { z } from 'zod';

const logger = createSafeLogger('analytics-persistence');

const SENSITIVE_FIELD_PATTERN = /(authorization|auth|bearer|brainid|cookie|email|jwt|localstorage|password|rawstorage|refresh|screenshot|secret|token|user)/i;

function containsSensitiveData(record: Record<string, unknown>): boolean {
  const json = JSON.stringify(record);
  return SENSITIVE_FIELD_PATTERN.test(json);
}

export async function persistSessionAnalyticsSummary(
  record: SessionAnalyticsSummaryRecord,
): Promise<void> {
  if (containsSensitiveData(record as Record<string, unknown>)) {
    logger.warn('Summary record contains sensitive material, rejecting', {
      jobId: record.jobId,
    });
    throw new Error('Summary record contains sensitive material');
  }

  const validation = SessionAnalyticsSummaryRecordSchema.safeParse(record);
  if (!validation.success) {
    logger.warn('Invalid summary record rejected', { error: validation.error.format() });
    throw new Error('Invalid SessionAnalyticsSummaryRecord');
  }

  try {
    await prisma.sessionAnalyticsSummary.upsert({
      where: { jobId: record.jobId },
      create: {
        jobId: record.jobId,
        sourceSessionId: record.sourceSessionId,
        moduleId: record.moduleId,
        category: record.category,
        completed: record.completed,
        eventCount: record.eventCount,
        clickCount: record.clickCount,
        durationMs: record.durationMs,
        p50ReactionMs: record.p50ReactionMs,
        p95ReactionMs: record.p95ReactionMs,
        speedSlope: record.speedSlope,
        accuracy: record.accuracy,
        fatigueIndex: record.fatigueIndex,
        engagementIndex: record.engagementIndex,
        suspiciousPatternScore: record.suspiciousPatternScore,
        recommendationSignals: record.recommendationSignals,
      },
      update: {},
    });
  } catch (err) {
    logger.error('Failed to persist analytics summary', { error: safeError(err), jobId: record.jobId });
    throw err;
  }
}

export interface SummaryQueryParams {
  userId?: string;
  moduleId?: string;
  category?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export async function getSessionAnalyticsSummaries(
  params: SummaryQueryParams = {},
) {
  const { moduleId, category, from, to, limit = 100 } = params;

  return prisma.sessionAnalyticsSummary.findMany({
    where: {
      ...(moduleId ? { moduleId } : {}),
      ...(category ? { category } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 500),
  });
}

export async function getModuleTrendData(
  moduleId: string,
  days: number,
): Promise<TrendPoint[]> {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const summaries = await prisma.sessionAnalyticsSummary.findMany({
    where: {
      moduleId,
      createdAt: { gte: from },
    },
    orderBy: { createdAt: 'asc' },
  });

  return aggregateByDay(summaries);
}

export async function getAggregateTrendData(
  days: number,
): Promise<TrendPoint[]> {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const summaries = await prisma.sessionAnalyticsSummary.findMany({
    where: {
      createdAt: { gte: from },
    },
    orderBy: { createdAt: 'asc' },
  });

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
  moduleId: string | null,
  days: number,
): Promise<CognitiveTrend> {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const where = {
    ...(moduleId ? { moduleId } : {}),
    createdAt: { gte: from },
  };

  const summaries = await prisma.sessionAnalyticsSummary.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

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
