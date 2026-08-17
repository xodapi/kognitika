import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaAnalyticsJobWriter } from '../server/infrastructure/prisma/prisma-analytics-job-writer.ts';

describe('PrismaAnalyticsJobWriter', () => {
  beforeEach(() => {
    vi.stubEnv('ANALYTICS_OUTBOX_SHADOW_ENABLED', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('writes a canonical analytics job and queues it without copying arbitrary session metadata', async () => {
    const tx = {
      completedSessionAnalyticsJob: { create: vi.fn().mockResolvedValue({}) },
      analyticsOutboxEntry: { create: vi.fn().mockResolvedValue({}) },
    };
    const writer = new PrismaAnalyticsJobWriter();

    await writer.write(tx, 'session-a', {
      schemaVersion: 1, jobId: 'job-a', analyzerVersion: 'analyze-session-v1',
      receivedAt: '2026-01-01T00:00:01.000Z', sessionId: 'browser-a',
      moduleId: 'schulte', moduleVersion: '1', category: 'cognitive',
      startedAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:00:01.000Z',
      events: [],
    }, new Date('2026-01-01T00:00:02.000Z'));

    expect(tx.completedSessionAnalyticsJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ jobId: 'job-a', gameSessionId: 'session-a' }),
    });
    expect(tx.analyticsOutboxEntry.create).toHaveBeenCalledOnce();
  });

  it('does not queue an outbox entry without a canonical analytics job', async () => {
    const tx = {
      completedSessionAnalyticsJob: { create: vi.fn().mockResolvedValue({}) },
      analyticsOutboxEntry: { create: vi.fn().mockResolvedValue({}) },
    };

    await new PrismaAnalyticsJobWriter().write(
      tx,
      'session-without-canonical-job',
      undefined,
      new Date('2026-01-01T00:00:02.000Z'),
    );

    expect(tx.completedSessionAnalyticsJob.create).not.toHaveBeenCalled();
    expect(tx.analyticsOutboxEntry.create).not.toHaveBeenCalled();
  });
});
