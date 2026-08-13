import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  analyticsOutboxEntry: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  completedSessionAnalyticsJob: { findUnique: vi.fn() },
  gameSession: { findUnique: vi.fn() },
}));

vi.mock('../lib/prisma.ts', () => ({ default: prismaMock }));
const summaryRepository = vi.hoisted(() => ({
  upsert: vi.fn(),
}));

const now = new Date('2026-08-03T02:20:00.000Z');
const baseRecord = {
  id: 'outbox-synthetic-001',
  sourceSessionId: 'session-synthetic-001',
  analyzerVersion: 'rust-shadow-v1',
  contractVersion: 'analytics-contract-v1',
  idempotencyKey: 'session-synthetic-001:rust-shadow-v1:analytics-contract-v1',
  occurredAt: now,
  state: 'pending',
  attemptCount: 0,
  leaseOwner: null,
  leaseExpiresAt: null,
  completedAt: null,
  lastErrorCode: null,
  authority: 'typescript',
  shadowCandidate: 'rust',
};

describe('Prisma analytics outbox store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('claims the oldest pending job through Prisma and assigns a lease', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ ...baseRecord, state: 'processing', leaseOwner: 'node-worker-a', leaseExpiresAt: new Date(now.getTime() + 1_000) }]);
    const { PrismaAnalyticsOutboxStore } = await import('../server/infrastructure/prisma/prisma-analytics-outbox-store.ts');

    const entry = await new PrismaAnalyticsOutboxStore().claimNext('node-worker-a', now, 1_000);

    expect(entry).toMatchObject({ state: 'processing', leaseOwner: 'node-worker-a' });
    expect(prismaMock.$queryRaw).toHaveBeenCalledOnce();
  });

  it('does not return a job when a competing worker already changed its state', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);
    const { PrismaAnalyticsOutboxStore } = await import('../server/infrastructure/prisma/prisma-analytics-outbox-store.ts');

    await expect(new PrismaAnalyticsOutboxStore().claimNext('node-worker-a', now, 1_000)).resolves.toBeNull();
  });

  it('completes and fails only while the worker has an unexpired lease', async () => {
    prismaMock.analyticsOutboxEntry.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.analyticsOutboxEntry.findFirst.mockResolvedValue({
      ...baseRecord,
      state: 'processing',
      leaseOwner: 'node-worker-a',
      leaseExpiresAt: new Date(now.getTime() + 1_000),
    });
    const { PrismaAnalyticsOutboxStore } = await import('../server/infrastructure/prisma/prisma-analytics-outbox-store.ts');
    const store = new PrismaAnalyticsOutboxStore();

    await expect(store.complete(baseRecord.id, 'node-worker-a', now)).resolves.toBe(true);
    await expect(store.fail(baseRecord.id, 'node-worker-a', now, 2, 'analyzer unavailable')).resolves.toMatchObject({ state: 'retry', attemptCount: 1 });

    for (const call of prismaMock.analyticsOutboxEntry.updateMany.mock.calls) {
      expect(call[0].where).toMatchObject({ state: 'processing', leaseOwner: 'node-worker-a', leaseExpiresAt: { gt: now } });
    }
  });

  it('completes legacy rows without a canonical job instead of retrying indefinitely', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ ...baseRecord, state: 'processing', leaseOwner: 'node-worker-a', leaseExpiresAt: new Date(now.getTime() + 1_000) }]);
    prismaMock.completedSessionAnalyticsJob.findUnique.mockResolvedValue(null);
    prismaMock.analyticsOutboxEntry.updateMany.mockResolvedValue({ count: 1 });
    const { PrismaAnalyticsOutboxStore } = await import('../server/infrastructure/prisma/prisma-analytics-outbox-store.ts');

    await expect(new PrismaAnalyticsOutboxStore().dispatchNext({
      workerId: 'node-worker-a', now, leaseMs: 1_000, maxAttempts: 2,
    })).resolves.toEqual({ status: 'skipped', reason: 'canonical_job_not_found' });
    expect(prismaMock.analyticsOutboxEntry.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.analyticsOutboxEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ state: 'completed' }),
    }));
  });

  it('retries a persisted canonical job that fails revalidation', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ ...baseRecord, state: 'processing', leaseOwner: 'node-worker-a', leaseExpiresAt: new Date(now.getTime() + 1_000) }]);
    prismaMock.completedSessionAnalyticsJob.findUnique.mockResolvedValue({ payload: { schemaVersion: 999 } });
    prismaMock.analyticsOutboxEntry.findFirst.mockResolvedValue({
      ...baseRecord, state: 'processing', leaseOwner: 'node-worker-a', leaseExpiresAt: new Date(now.getTime() + 1_000),
    });
    prismaMock.analyticsOutboxEntry.updateMany.mockResolvedValue({ count: 1 });
    const { PrismaAnalyticsOutboxStore } = await import('../server/infrastructure/prisma/prisma-analytics-outbox-store.ts');

    await expect(new PrismaAnalyticsOutboxStore().dispatchNext({
      workerId: 'node-worker-a', now, leaseMs: 1_000, maxAttempts: 2,
    })).resolves.toEqual({ status: 'failed', errorCode: 'invalid_canonical_job' });
    expect(prismaMock.analyticsOutboxEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ state: 'retry', lastErrorCode: 'invalid_canonical_job' }),
    }));
  });

  it('dispatches a leased canonical job through Node and persists only its summary', async () => {
    const canonicalJob = {
      schemaVersion: 1,
      jobId: 'analytics-job-synthetic-dispatch',
      analyzerVersion: 'analyze-session-v1',
      receivedAt: '2026-08-03T02:20:01.000Z',
      sessionId: 'browser-session-synthetic',
      moduleId: 'schulte',
      moduleVersion: '1',
      category: 'cognitive',
      startedAt: '2026-08-03T02:20:00.000Z',
      completedAt: '2026-08-03T02:20:01.000Z',
      events: [
        { schemaVersion: 1, eventId: 'browser-session-synthetic:0', sessionId: 'browser-session-synthetic', moduleId: 'schulte', moduleVersion: '1', category: 'cognitive', sequence: 0, tMs: 0, kind: 'trial_started', trialType: 'schulte:cell' },
        { schemaVersion: 1, eventId: 'browser-session-synthetic:1', sessionId: 'browser-session-synthetic', moduleId: 'schulte', moduleVersion: '1', category: 'cognitive', sequence: 1, tMs: 500, kind: 'trial_answered', trialType: 'schulte:cell', isCorrect: true, reactionTimeMs: 500 },
        { schemaVersion: 1, eventId: 'browser-session-synthetic:2', sessionId: 'browser-session-synthetic', moduleId: 'schulte', moduleVersion: '1', category: 'cognitive', sequence: 2, tMs: 1_000, kind: 'session_completed', completedAt: '2026-08-03T02:20:01.000Z' },
      ],
    };
    prismaMock.$queryRaw.mockResolvedValue([{ ...baseRecord, state: 'processing', leaseOwner: 'node-worker-a', leaseExpiresAt: new Date(now.getTime() + 1_000) }]);
    prismaMock.completedSessionAnalyticsJob.findUnique.mockResolvedValue({ payload: canonicalJob });
    prismaMock.gameSession.findUnique.mockResolvedValue({ userId: 'user-synthetic' });
    prismaMock.analyticsOutboxEntry.updateMany.mockResolvedValue({ count: 1 });
    const { PrismaAnalyticsOutboxStore } = await import('../server/infrastructure/prisma/prisma-analytics-outbox-store.ts');

    const result = await new PrismaAnalyticsOutboxStore(null, summaryRepository).dispatchNext({
      workerId: 'node-worker-a', now, leaseMs: 1_000, maxAttempts: 2,
    });

    expect(result).toMatchObject({ status: 'completed', summary: { jobId: canonicalJob.jobId, sourceSessionId: baseRecord.sourceSessionId } });
    expect(summaryRepository.upsert).toHaveBeenCalledWith('user-synthetic', expect.objectContaining({ jobId: canonicalJob.jobId }));
    expect(JSON.stringify(prismaMock.completedSessionAnalyticsJob.findUnique.mock.calls[0][0])).not.toMatch(/brainid|jwt|email|token|metadata/i);
  });

  it('recovers expired leases within the retry budget and emits aggregate-only metrics', async () => {
    prismaMock.analyticsOutboxEntry.findMany
      .mockResolvedValueOnce([{ id: baseRecord.id, attemptCount: 0 }])
      .mockResolvedValueOnce([
        baseRecord,
        { ...baseRecord, id: 'outbox-synthetic-dead', state: 'dead', attemptCount: 2, lastErrorCode: 'analyzer_unavailable' },
      ]);
    prismaMock.analyticsOutboxEntry.updateMany.mockResolvedValue({ count: 1 });
    const { PrismaAnalyticsOutboxStore } = await import('../server/infrastructure/prisma/prisma-analytics-outbox-store.ts');
    const store = new PrismaAnalyticsOutboxStore();

    await expect(store.recoverExpiredLeases(now, 2)).resolves.toBe(1);
    await expect(store.metrics(now)).resolves.toEqual({
      pending: 1,
      processing: 0,
      retry: 0,
      completed: 0,
      dead: 1,
      oldestLagMs: 0,
      failures: 1,
    });
    expect(prismaMock.analyticsOutboxEntry.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: baseRecord.id,
        state: 'processing',
        attemptCount: 0,
        leaseExpiresAt: { lte: now },
      }),
      data: expect.objectContaining({
        state: 'retry',
        attemptCount: 1,
        lastErrorCode: 'lease_expired',
      }),
    }));
    expect(JSON.stringify(prismaMock.analyticsOutboxEntry.findMany.mock.calls[0][0])).not.toMatch(/brainid|jwt|email|token|metadata/i);
    expect(prismaMock.analyticsOutboxEntry.findMany.mock.calls[1][0]).toEqual({
      select: {
        occurredAt: true,
        state: true,
      },
    });
  });

  it('purges only completed rows older than the retention cutoff', async () => {
    prismaMock.analyticsOutboxEntry.deleteMany.mockResolvedValue({ count: 2 });
    const { PrismaAnalyticsOutboxStore } = await import('../server/infrastructure/prisma/prisma-analytics-outbox-store.ts');
    const cutoff = new Date('2026-07-01T00:00:00.000Z');

    await expect(new PrismaAnalyticsOutboxStore().purgeCompletedBefore(cutoff)).resolves.toBe(2);
    expect(prismaMock.analyticsOutboxEntry.deleteMany).toHaveBeenCalledWith({
      where: {
        state: 'completed',
        completedAt: { lt: cutoff },
      },
    });
  });
});
