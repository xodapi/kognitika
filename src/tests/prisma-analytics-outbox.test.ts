import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  analyticsOutboxEntry: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('../lib/prisma.ts', () => ({ default: prismaMock }));

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
    const { PrismaAnalyticsOutboxStore } = await import('../server/services/analytics-outbox.ts');

    const entry = await new PrismaAnalyticsOutboxStore().claimNext('node-worker-a', now, 1_000);

    expect(entry).toMatchObject({ state: 'processing', leaseOwner: 'node-worker-a' });
    expect(prismaMock.$queryRaw).toHaveBeenCalledOnce();
  });

  it('does not return a job when a competing worker already changed its state', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);
    const { PrismaAnalyticsOutboxStore } = await import('../server/services/analytics-outbox.ts');

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
    const { PrismaAnalyticsOutboxStore } = await import('../server/services/analytics-outbox.ts');
    const store = new PrismaAnalyticsOutboxStore();

    await expect(store.complete(baseRecord.id, 'node-worker-a', now)).resolves.toBe(true);
    await expect(store.fail(baseRecord.id, 'node-worker-a', now, 2, 'analyzer unavailable')).resolves.toMatchObject({ state: 'retry', attemptCount: 1 });

    for (const call of prismaMock.analyticsOutboxEntry.updateMany.mock.calls) {
      expect(call[0].where).toMatchObject({ state: 'processing', leaseOwner: 'node-worker-a', leaseExpiresAt: { gt: now } });
    }
  });

  it('recovers expired leases within the retry budget and emits aggregate-only metrics', async () => {
    prismaMock.analyticsOutboxEntry.findMany
      .mockResolvedValueOnce([{ id: baseRecord.id, attemptCount: 0 }])
      .mockResolvedValueOnce([
        baseRecord,
        { ...baseRecord, id: 'outbox-synthetic-dead', state: 'dead', attemptCount: 2, lastErrorCode: 'analyzer_unavailable' },
      ]);
    prismaMock.analyticsOutboxEntry.updateMany.mockResolvedValue({ count: 1 });
    const { PrismaAnalyticsOutboxStore } = await import('../server/services/analytics-outbox.ts');
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
    expect(JSON.stringify(prismaMock.analyticsOutboxEntry.findMany.mock.calls[0][0])).not.toMatch(/brainid|jwt|email|token|metadata/i);
  });
});
