import type { PrismaClient } from '@prisma/client';
import type {
  LongitudinalObservationRepository,
  LongitudinalObservationRow,
  LongitudinalStrataProjection,
  LongitudinalStrataProjectionRepository,
} from '../../repositories/longitudinal-observation-repository.ts';
import { parseCompletedSessionAnalyticsJob } from '../../../core/cognitive-events/to-analyze-session.ts';
import { LONGITUDINAL_STRATA_POLICY, resolveLongitudinalStratum } from '../../../lib/longitudinal-strata.ts';

export class PrismaLongitudinalObservationRepository implements LongitudinalObservationRepository, LongitudinalStrataProjectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findLongitudinalObservations(
    userId: string,
    moduleId: string,
    from: Date,
    to: Date,
  ): Promise<LongitudinalObservationRow[]> {
    const sessions = await this.prisma.gameSession.findMany({
      where: {
        userId,
        isCompleted: true,
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true },
    });

    if (sessions.length === 0) return [];

    const summaries = await this.prisma.sessionAnalyticsSummary.findMany({
      where: {
        userId,
        moduleId,
        completed: true,
        sourceSessionId: { in: sessions.map((session) => session.id) },
      },
      select: {
        sourceSessionId: true,
        accuracy: true,
        p50ReactionMs: true,
      },
    });

    const summaryBySession = new Map<string, typeof summaries[number]>();
    const duplicateSessionIds = new Set<string>();
    for (const summary of summaries) {
      if (summaryBySession.has(summary.sourceSessionId)) {
        duplicateSessionIds.add(summary.sourceSessionId);
      } else {
        summaryBySession.set(summary.sourceSessionId, summary);
      }
    }

    return sessions.flatMap((session) => {
      const summary = summaryBySession.get(session.id);
      if (!summary || duplicateSessionIds.has(session.id)) return [];
      return [{
        sourceSessionId: session.id,
        occurredAt: session.createdAt,
        accuracy: summary.accuracy,
        reactionMs: summary.p50ReactionMs,
      }];
    });
  }

  async findLongitudinalStrataProjection(
    userId: string, moduleId: string, from: Date, to: Date,
  ): Promise<LongitudinalStrataProjection> {
    const sessions = await this.prisma.gameSession.findMany({
      where: {
        userId,
        isCompleted: true,
        analyticsJob: { is: { moduleId, completedAt: { gte: from, lte: to } } },
      },
      select: {
        id: true,
        analyticsJob: {
          select: { jobId: true, gameSessionId: true, moduleId: true, moduleVersion: true, completedAt: true, payload: true },
        },
      },
    });
    const exclusions: Record<string, number> = {};
    const exclude = (reason: string) => { exclusions[reason] = (exclusions[reason] ?? 0) + 1; };
    const jobs = sessions.flatMap((session) => {
      const job = session.analyticsJob;
      if (!job || job.moduleId !== moduleId || job.gameSessionId !== session.id) {
        exclude('invalid_canonical_job');
        return [];
      }
      const parsed = parseCompletedSessionAnalyticsJob(job.payload);
      if (!parsed.success
        || parsed.data.jobId !== job.jobId
        || parsed.data.sessionId !== session.id
        || parsed.data.moduleId !== job.moduleId
        || parsed.data.moduleVersion !== job.moduleVersion
        || parsed.data.completedAt !== job.completedAt.toISOString()) {
        exclude('invalid_canonical_job');
        return [];
      }
      return [{ sessionId: session.id, job, parsed: parsed.data }];
    });
    if (jobs.length === 0) return { rows: [], exclusions };
    const summaries = await this.prisma.sessionAnalyticsSummary.findMany({
      where: {
        userId, moduleId, completed: true,
        sourceSessionId: { in: jobs.map(({ sessionId }) => sessionId) },
        jobId: { in: jobs.map(({ job }) => job.jobId) },
      },
      select: {
        jobId: true, userId: true, sourceSessionId: true, completed: true, eventCount: true,
        suspiciousPatternScore: true, accuracy: true, p50ReactionMs: true,
      },
    });
    const summariesByJob = new Map<string, typeof summaries[number]>();
    const duplicateJobIds = new Set<string>();
    for (const summary of summaries) {
      if (summariesByJob.has(summary.jobId)) duplicateJobIds.add(summary.jobId);
      else summariesByJob.set(summary.jobId, summary);
    }
    const rows = jobs.flatMap(({ sessionId, job, parsed }) => {
      const summary = summariesByJob.get(job.jobId);
      if (!summary || duplicateJobIds.has(job.jobId)
        || summary.userId !== userId || summary.sourceSessionId !== sessionId) {
        exclude('missing_or_mismatched_summary');
        return [];
      }
      const stratum = resolveLongitudinalStratum(parsed, LONGITUDINAL_STRATA_POLICY);
      if (!stratum.eligible) {
        exclude(`strata_${stratum.reason}`);
        return [];
      }
      return [{
        occurredAt: job.completedAt,
        stratum: stratum.stratum,
        completed: summary.completed,
        eventCount: summary.eventCount,
        suspiciousPatternScore: summary.suspiciousPatternScore,
        accuracy: summary.accuracy,
        reactionMs: summary.p50ReactionMs,
      }];
    });
    return { rows, exclusions };
  }
}
