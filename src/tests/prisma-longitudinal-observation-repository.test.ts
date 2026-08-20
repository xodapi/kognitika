import { describe, expect, it, vi } from 'vitest';
import { PrismaLongitudinalObservationRepository } from '../server/infrastructure/prisma/prisma-longitudinal-observation-repository.ts';

describe('PrismaLongitudinalObservationRepository', () => {
  it('projects only owned canonical job and matching summary intersections at job completion time', async () => {
    const completedAt = new Date('2026-08-19T12:00:00.000Z');
    const sessionId = 'session-nback';
    const jobId = 'analytics-job-nback';
    const eventBase = {
      schemaVersion: 1, sessionId, moduleId: 'nback', moduleVersion: '1', category: 'cognitive',
    };
    const payload = {
      schemaVersion: 1, jobId, analyzerVersion: 'analyze-session-v1',
      receivedAt: '2026-08-19T12:00:01.000Z', ...eventBase,
      startedAt: '2026-08-19T12:00:00.000Z', completedAt: completedAt.toISOString(),
      events: [
        { ...eventBase, eventId: 'event-start', sequence: 0, tMs: 0, kind: 'trial_started', trialType: 'nback:trial', difficulty: 'n-2' },
        { ...eventBase, eventId: 'event-done', sequence: 1, tMs: 1, kind: 'session_completed', completedAt: completedAt.toISOString() },
      ],
    };
    const prisma = {
      gameSession: { findMany: vi.fn().mockResolvedValue([{
        id: sessionId,
        analyticsJob: { jobId, gameSessionId: sessionId, moduleId: 'nback', moduleVersion: '1', completedAt, payload },
      }]) },
      sessionAnalyticsSummary: { findMany: vi.fn().mockResolvedValue([{
        jobId, userId: 'user-a', sourceSessionId: sessionId, completed: true,
        eventCount: 2, suspiciousPatternScore: 1, accuracy: 0.8, p50ReactionMs: 180,
      }]) },
    };
    const from = new Date('2026-05-22T00:00:00.000Z');
    const to = new Date('2026-08-20T00:00:00.000Z');
    const result = await new PrismaLongitudinalObservationRepository(prisma as any)
      .findLongitudinalStrataProjection('user-a', 'nback', from, to);

    expect(result).toEqual({
      exclusions: {},
      rows: [{
        occurredAt: completedAt,
        stratum: { moduleId: 'nback', moduleVersion: '1', difficulty: 'n-2', label: 'n-2' },
        completed: true, eventCount: 2, suspiciousPatternScore: 1, accuracy: 0.8, reactionMs: 180,
      }],
    });
    expect(prisma.gameSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 'user-a',
        analyticsJob: { is: { moduleId: 'nback', completedAt: { gte: from, lte: to } } },
      }),
    }));
    expect(prisma.sessionAnalyticsSummary.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'user-a', moduleId: 'nback', jobId: { in: [jobId] } }),
    }));
  });

  it('excludes invalid canonical jobs and missing or mismatched summaries', async () => {
    const prisma = {
      gameSession: { findMany: vi.fn().mockResolvedValue([
        { id: 'invalid', analyticsJob: { jobId: 'analytics-job-invalid', gameSessionId: 'invalid', moduleId: 'nback', moduleVersion: '1', completedAt: new Date(), payload: {} } },
      ]) },
      sessionAnalyticsSummary: { findMany: vi.fn() },
    };
    const result = await new PrismaLongitudinalObservationRepository(prisma as any)
      .findLongitudinalStrataProjection('user-a', 'nback', new Date(0), new Date('2100-01-01'));

    expect(result).toEqual({ rows: [], exclusions: { invalid_canonical_job: 1 } });
    expect(prisma.sessionAnalyticsSummary.findMany).not.toHaveBeenCalled();
  });

  it('joins authenticated completed sessions to one matching module summary using session creation time', async () => {
    const prisma = {
      gameSession: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'session-a', createdAt: new Date('2026-08-01T00:00:00.000Z') },
          { id: 'session-b', createdAt: new Date('2026-08-02T00:00:00.000Z') },
        ]),
      },
      sessionAnalyticsSummary: {
        findMany: vi.fn().mockResolvedValue([
          { sourceSessionId: 'session-a', accuracy: 0.9, p50ReactionMs: 180 },
          { sourceSessionId: 'session-b', accuracy: 0.8, p50ReactionMs: 200 },
          { sourceSessionId: 'session-b', accuracy: 0.7, p50ReactionMs: 210 },
        ]),
      },
    };
    const from = new Date('2026-05-22T00:00:00.000Z');
    const to = new Date('2026-08-20T00:00:00.000Z');

    const rows = await new PrismaLongitudinalObservationRepository(prisma as any)
      .findLongitudinalObservations('user-a', 'nback', from, to);

    expect(rows).toEqual([{
      sourceSessionId: 'session-a',
      occurredAt: new Date('2026-08-01T00:00:00.000Z'),
      accuracy: 0.9,
      reactionMs: 180,
    }]);
    expect(prisma.gameSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-a', isCompleted: true, createdAt: { gte: from, lte: to } },
      select: { id: true, createdAt: true },
    }));
    expect(prisma.sessionAnalyticsSummary.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 'user-a',
        moduleId: 'nback',
        completed: true,
        sourceSessionId: { in: ['session-a', 'session-b'] },
      }),
      select: { sourceSessionId: true, accuracy: true, p50ReactionMs: true },
    }));
  });
});
