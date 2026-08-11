import type { PrismaClient } from '@prisma/client';
import type {
  AnalyticsSummaryQuery,
  AnalyticsSummaryRepository,
  AnalyticsSummaryRow,
} from '../../repositories/analytics-summary-repository.ts';
import type { SessionAnalyticsSummaryRecord } from '../../../core/analyze-session/index.ts';

const analyticsSummarySelect = {
  createdAt: true,
  accuracy: true,
  p50ReactionMs: true,
  fatigueIndex: true,
  engagementIndex: true,
} as const;

export class PrismaAnalyticsSummaryRepository implements AnalyticsSummaryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(userId: string, record: SessionAnalyticsSummaryRecord): Promise<void> {
    const persisted = await this.prisma.sessionAnalyticsSummary.upsert({
      where: { jobId: record.jobId },
      create: {
        jobId: record.jobId,
        userId,
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
      select: { userId: true, sourceSessionId: true },
    });

    if (persisted.userId !== userId || persisted.sourceSessionId !== record.sourceSessionId) {
      throw new Error('Analytics summary idempotency conflict');
    }
  }

  async findSummaries(query: AnalyticsSummaryQuery): Promise<AnalyticsSummaryRow[]> {
    return this.prisma.sessionAnalyticsSummary.findMany({
      where: {
        userId: query.userId,
        ...(query.moduleId ? { moduleId: query.moduleId } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: query.from } : {}),
                ...(query.to ? { lte: query.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(query.limit ?? 100, 500),
      select: analyticsSummarySelect,
    });
  }

  async findTrendRows(
    userId: string,
    moduleId: string | null,
    from: Date,
  ): Promise<AnalyticsSummaryRow[]> {
    return this.prisma.sessionAnalyticsSummary.findMany({
      where: {
        userId,
        ...(moduleId ? { moduleId } : {}),
        createdAt: { gte: from },
      },
      orderBy: { createdAt: 'asc' },
      select: analyticsSummarySelect,
    });
  }
}
