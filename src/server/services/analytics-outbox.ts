import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma.ts';
import {
  type AnalyticsOutboxEntry,
  type AnalyticsOutboxState,
  buildAnalyticsOutboxMetrics,
} from '../../core/analytics-outbox/index.ts';
import {
  completedSessionJobToAnalyzeSessionInput,
  parseCompletedSessionAnalyticsJob,
} from '../../core/cognitive-events/index.ts';
import {
  createSessionAnalyticsSummary,
  type SessionAnalyticsSummaryRecord,
} from '../../core/analyze-session/batch-analytics.ts';
import { persistSessionAnalyticsSummary } from './analytics-persistence.ts';
import type { RustAnalyticsSidecarClient } from './rust-analytics-sidecar.ts';

const CLAIMABLE_STATES: AnalyticsOutboxState[] = ['pending', 'retry'];
const CLAIMABLE_STATE_SQL = Prisma.join(CLAIMABLE_STATES.map(state => Prisma.sql`${state}`));

export type AnalyticsDispatchResult =
  | { status: 'idle' }
  | { status: 'skipped'; reason: 'canonical_job_not_found' }
  | { status: 'completed'; summary: SessionAnalyticsSummaryRecord }
  | { status: 'failed'; errorCode: 'invalid_canonical_job' | 'persistence_failed' };

function toEntry(record: {
  id: string;
  sourceSessionId: string;
  analyzerVersion: string;
  contractVersion: string;
  idempotencyKey: string;
  occurredAt: Date;
  state: string;
  attemptCount: number;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
  completedAt: Date | null;
  lastErrorCode: string | null;
  authority: string;
  shadowCandidate: string;
}): AnalyticsOutboxEntry {
  return {
    id: record.id,
    sourceSession: record.sourceSessionId,
    analyzerVersion: record.analyzerVersion,
    contractVersion: record.contractVersion,
    idempotencyKey: record.idempotencyKey,
    occurredAt: record.occurredAt,
    state: record.state as AnalyticsOutboxState,
    attemptCount: record.attemptCount,
    leaseOwner: record.leaseOwner,
    leaseExpiresAt: record.leaseExpiresAt,
    ...(record.completedAt ? { completedAt: record.completedAt } : {}),
    ...(record.lastErrorCode ? { lastErrorCode: record.lastErrorCode as AnalyticsOutboxEntry['lastErrorCode'] } : {}),
    authority: 'typescript',
    shadowCandidate: 'rust',
  };
}

/**
 * Node/Prisma-owned durable store for shadow work. Rust receives jobs only
 * through a Node-mediated boundary and has no database credentials.
 */
export class PrismaAnalyticsOutboxStore {
  constructor(private readonly rustSidecar: RustAnalyticsSidecarClient | null = null) {}

  async claimNext(workerId: string, now: Date, leaseMs: number): Promise<AnalyticsOutboxEntry | null> {
    const leaseExpiresAt = new Date(now.getTime() + leaseMs);

    const claimed = await prisma.$queryRaw<Array<{
      id: string;
      sourceSessionId: string;
      analyzerVersion: string;
      contractVersion: string;
      idempotencyKey: string;
      occurredAt: Date;
      state: string;
      attemptCount: number;
      leaseOwner: string | null;
      leaseExpiresAt: Date | null;
      completedAt: Date | null;
      lastErrorCode: string | null;
      authority: string;
      shadowCandidate: string;
    }>>(Prisma.sql`
      WITH candidate AS (
        SELECT "id"
        FROM "analytics_outbox"
        WHERE "state" IN (${CLAIMABLE_STATE_SQL})
        ORDER BY "occurredAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "analytics_outbox" AS outbox
      SET "state" = 'processing', "leaseOwner" = ${workerId}, "leaseExpiresAt" = ${leaseExpiresAt}, "updatedAt" = ${now}
      FROM candidate
      WHERE outbox."id" = candidate."id"
      RETURNING outbox.*
    `);

    return claimed[0] ? toEntry(claimed[0]) : null;
  }

  async complete(id: string, workerId: string, now: Date): Promise<boolean> {
    const result = await prisma.analyticsOutboxEntry.updateMany({
      where: { id, state: 'processing', leaseOwner: workerId, leaseExpiresAt: { gt: now } },
      data: { state: 'completed', leaseOwner: null, leaseExpiresAt: null, completedAt: now },
    });
    return result.count === 1;
  }

  async fail(id: string, workerId: string, now: Date, maxAttempts: number, errorCode: string): Promise<AnalyticsOutboxEntry | null> {
    const entry = await prisma.analyticsOutboxEntry.findFirst({
      where: { id, state: 'processing', leaseOwner: workerId, leaseExpiresAt: { gt: now } },
    });
    if (!entry) return null;

    const attemptCount = entry.attemptCount + 1;
    const state: AnalyticsOutboxState = attemptCount >= maxAttempts ? 'dead' : 'retry';
    const result = await prisma.analyticsOutboxEntry.updateMany({
      where: {
        id,
        state: 'processing',
        leaseOwner: workerId,
        leaseExpiresAt: { gt: now },
        attemptCount: entry.attemptCount,
      },
      data: {
        state,
        attemptCount,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastErrorCode: errorCode === 'analyzer unavailable' ? 'analyzer_unavailable' : 'unknown',
      },
    });
    return result.count === 1
      ? toEntry({ ...entry, state, attemptCount, leaseOwner: null, leaseExpiresAt: null, lastErrorCode: errorCode === 'analyzer unavailable' ? 'analyzer_unavailable' : 'unknown' })
      : null;
  }

  async recoverExpiredLeases(now: Date, maxAttempts: number): Promise<number> {
    const expired = await prisma.analyticsOutboxEntry.findMany({
      where: { state: 'processing', leaseExpiresAt: { lte: now } },
      select: { id: true, attemptCount: true },
    });

    let recovered = 0;
    for (const entry of expired) {
      const attemptCount = entry.attemptCount + 1;
      const result = await prisma.analyticsOutboxEntry.updateMany({
        where: { id: entry.id, state: 'processing', leaseExpiresAt: { lte: now }, attemptCount: entry.attemptCount },
        data: {
          state: attemptCount >= maxAttempts ? 'dead' : 'retry',
          attemptCount,
          leaseOwner: null,
          leaseExpiresAt: null,
          lastErrorCode: 'lease_expired',
        },
      });
      recovered += result.count;
    }
    return recovered;
  }

  async getCanonicalJob(sourceSessionId: string) {
    const record = await prisma.completedSessionAnalyticsJob.findUnique({
      where: { gameSessionId: sourceSessionId },
      select: { payload: true },
    });
    if (!record) return { status: 'missing' as const };
    const parsed = parseCompletedSessionAnalyticsJob(record.payload);
    return parsed.success
      ? { status: 'valid' as const, job: parsed.data }
      : { status: 'invalid' as const };
  }

  async getSessionOwner(sourceSessionId: string) {
    const session = await prisma.gameSession.findUnique({
      where: { id: sourceSessionId },
      select: { userId: true },
    });
    return session?.userId ?? null;
  }

  async dispatchNext(options: { workerId: string; now?: Date; leaseMs: number; maxAttempts: number }): Promise<AnalyticsDispatchResult> {
    const now = options.now ?? new Date();
    const entry = await this.claimNext(options.workerId, now, options.leaseMs);
    if (!entry) return { status: 'idle' };

    const canonicalJob = await this.getCanonicalJob(entry.sourceSession);
    if (canonicalJob.status === 'missing') {
      await this.complete(entry.id, options.workerId, now);
      return { status: 'skipped', reason: 'canonical_job_not_found' };
    }
    if (canonicalJob.status === 'invalid') {
      await this.fail(entry.id, options.workerId, now, options.maxAttempts, 'invalid canonical job');
      return { status: 'failed', errorCode: 'invalid_canonical_job' };
    }

    try {
      const job = canonicalJob.job;
      const ownerId = await this.getSessionOwner(entry.sourceSession);
      if (!ownerId) throw new Error('session owner not found');
      const canonicalSession = completedSessionJobToAnalyzeSessionInput(job);
      const summary = createSessionAnalyticsSummary({
        schemaVersion: 1,
        jobId: job.jobId,
        analyzerVersion: job.analyzerVersion,
        receivedAt: job.receivedAt,
        session: { ...canonicalSession, sessionId: entry.sourceSession },
      });
      await persistSessionAnalyticsSummary(ownerId, summary);
      if (this.rustSidecar?.shouldAnalyze(entry.sourceSession)) {
        try {
          await this.rustSidecar.analyze(canonicalSession, {
            schemaVersion: 1,
            durationMs: summary.durationMs,
            clickCount: summary.clickCount,
            p50ReactionMs: summary.p50ReactionMs,
            p95ReactionMs: summary.p95ReactionMs,
            speedSlope: summary.speedSlope,
            accuracy: summary.accuracy,
            fatigueIndex: summary.fatigueIndex,
            engagementIndex: summary.engagementIndex,
            suspiciousPatternScore: summary.suspiciousPatternScore,
            recommendationSignals: summary.recommendationSignals,
          });
        } catch {
          // Rust is shadow-only. Its availability must never delay or roll back a saved summary.
        }
      }
      const completed = await this.complete(entry.id, options.workerId, now);
      if (!completed) throw new Error('outbox lease was lost');
      return { status: 'completed', summary };
    } catch {
      await this.fail(entry.id, options.workerId, now, options.maxAttempts, 'canonical job processing failed');
      return { status: 'failed', errorCode: 'persistence_failed' };
    }
  }

  async metrics(now: Date) {
    const entries = await prisma.analyticsOutboxEntry.findMany({
      select: {
        id: true,
        sourceSessionId: true,
        analyzerVersion: true,
        contractVersion: true,
        idempotencyKey: true,
        occurredAt: true,
        state: true,
        attemptCount: true,
        leaseOwner: true,
        leaseExpiresAt: true,
        completedAt: true,
        lastErrorCode: true,
        authority: true,
        shadowCandidate: true,
      },
    });
    return buildAnalyticsOutboxMetrics(entries.map(toEntry), now);
  }
}
