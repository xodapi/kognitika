/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it } from 'vitest';
import prisma from '../lib/prisma.ts';
import { PrismaAnalyticsOutboxStore } from '../server/infrastructure/prisma/prisma-analytics-outbox-store.ts';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const testIds: string[] = [];

async function createOutboxEntry(
  state: 'pending' | 'processing' | 'completed',
  leaseExpiresAt: Date | null = null,
  completedAt: Date | null = null,
) {
  const suffix = crypto.randomUUID();
  const user = await prisma.user.create({
    data: { name: `outbox-integration-${suffix}` },
  });
  testIds.push(user.id);
  const session = await prisma.gameSession.create({
    data: {
      userId: user.id,
      gameType: 'SCHULTE',
      score: 1,
      timeMs: 1,
      isCompleted: true,
      metadata: {},
    },
  });
  return prisma.analyticsOutboxEntry.create({
    data: {
      sourceSessionId: session.id,
      analyzerVersion: 'rust-shadow-v1',
      contractVersion: 'analytics-contract-v1',
      idempotencyKey: `${session.id}:rust-shadow-v1:analytics-contract-v1`,
      occurredAt: new Date('2026-08-03T02:20:00.000Z'),
      state,
      attemptCount: 0,
      leaseOwner: state === 'processing' ? 'expired-worker' : null,
      leaseExpiresAt,
      completedAt,
    },
  });
}

describe.runIf(hasDatabase)('Prisma analytics outbox PostgreSQL integration', () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: testIds.splice(0) } } });
  });

  it('claims distinct pending rows through PostgreSQL locking', async () => {
    await createOutboxEntry('pending');
    await createOutboxEntry('pending');
    const store = new PrismaAnalyticsOutboxStore();
    const now = new Date('2026-08-03T02:20:01.000Z');

    const [first, second] = await Promise.all([
      store.claimNext('integration-worker-a', now, 1_000),
      store.claimNext('integration-worker-b', now, 1_000),
    ]);

    expect(first).toMatchObject({
      state: 'processing',
      leaseOwner: 'integration-worker-a',
    });
    expect(second).toMatchObject({
      state: 'processing',
      leaseOwner: 'integration-worker-b',
    });
    expect(first?.sourceSession).not.toBe(second?.sourceSession);
  });

  it('recovers an expired lease through its compare-and-set update', async () => {
    const expiredAt = new Date('2026-08-03T02:20:00.000Z');
    const entry = await createOutboxEntry('processing', expiredAt);
    const store = new PrismaAnalyticsOutboxStore();
    const now = new Date('2026-08-03T02:20:01.000Z');

    await expect(store.recoverExpiredLeases(now, 2)).resolves.toBe(1);
    await expect(prisma.analyticsOutboxEntry.findUnique({
      where: { id: entry.id },
    })).resolves.toMatchObject({
      state: 'retry',
      attemptCount: 1,
      leaseOwner: null,
      leaseExpiresAt: null,
      lastErrorCode: 'lease_expired',
    });
  });

  it('purges only completed rows before the retention cutoff', async () => {
    const oldCompleted = await createOutboxEntry(
      'completed',
      null,
      new Date('2026-06-01T00:00:00.000Z'),
    );
    const pending = await createOutboxEntry('pending');
    const store = new PrismaAnalyticsOutboxStore();

    await expect(store.purgeCompletedBefore(new Date('2026-07-01T00:00:00.000Z'), 100)).resolves.toBe(1);
    await expect(prisma.analyticsOutboxEntry.findUnique({
      where: { id: oldCompleted.id },
    })).resolves.toBeNull();
    await expect(prisma.analyticsOutboxEntry.findUnique({
      where: { id: pending.id },
    })).resolves.toMatchObject({ state: 'pending' });
  });

  it('returns a coherent metrics snapshot while purge and dispatch run concurrently', async () => {
    await createOutboxEntry(
      'completed',
      null,
      new Date('2026-06-01T00:00:00.000Z'),
    );
    await createOutboxEntry('pending');
    const store = new PrismaAnalyticsOutboxStore();
    const now = new Date('2026-08-03T02:20:01.000Z');

    const [metrics] = await Promise.all([
      store.metrics(now),
      store.purgeCompletedBefore(new Date('2026-07-01T00:00:00.000Z'), 100),
      store.dispatchNext({
        workerId: 'integration-worker-metrics',
        now,
        leaseMs: 1_000,
        maxAttempts: 2,
      }),
    ]);

    expect(metrics.pending === 1 ? metrics.oldestLagMs : 0).toBe(
      metrics.pending === 1 ? 1_000 : 0,
    );
    expect(metrics.pending + metrics.processing + metrics.completed).toBeGreaterThanOrEqual(1);
  });
});
