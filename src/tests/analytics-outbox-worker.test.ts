import { describe, expect, it, vi } from 'vitest';
import {
  AnalyticsOutboxWorker,
  DEFAULT_ANALYTICS_OUTBOX_WORKER_OPTIONS,
  isAnalyticsOutboxDispatcherEnabled,
} from '../server/services/analytics-outbox-worker.ts';

describe('analytics outbox worker', () => {
  const options = {
    ...DEFAULT_ANALYTICS_OUTBOX_WORKER_OPTIONS,
    workerId: 'node-test-worker',
  };

  it('is disabled unless explicitly opted in', () => {
    expect(isAnalyticsOutboxDispatcherEnabled({})).toBe(false);
    expect(isAnalyticsOutboxDispatcherEnabled({ ANALYTICS_OUTBOX_DISPATCH_ENABLED: 'false' })).toBe(false);
    expect(isAnalyticsOutboxDispatcherEnabled({ ANALYTICS_OUTBOX_DISPATCH_ENABLED: 'true' })).toBe(true);
  });

  it('recovers expired leases and drains a bounded batch', async () => {
    const dispatcher = {
      recoverExpiredLeases: vi.fn().mockResolvedValue(2),
      dispatchNext: vi.fn()
        .mockResolvedValueOnce({ status: 'completed' })
        .mockResolvedValueOnce({ status: 'skipped' })
        .mockResolvedValueOnce({ status: 'idle' }),
    };
    const worker = new AnalyticsOutboxWorker(dispatcher, { ...options, batchSize: 5 });

    await expect(worker.runOnce(new Date('2026-08-04T12:00:00.000Z'))).resolves.toEqual({ recovered: 2, dispatched: 2 });
    expect(dispatcher.recoverExpiredLeases).toHaveBeenCalledWith(expect.any(Date), options.maxAttempts);
    expect(dispatcher.dispatchNext).toHaveBeenCalledTimes(3);
    expect(dispatcher.dispatchNext).toHaveBeenCalledWith(expect.objectContaining({
      workerId: options.workerId,
      leaseMs: options.leaseMs,
      maxAttempts: options.maxAttempts,
    }));
  });

  it('does not overlap a running worker cycle', async () => {
    let resolveRecovery!: (value: number) => void;
    const dispatcher = {
      recoverExpiredLeases: vi.fn(() => new Promise<number>(resolve => { resolveRecovery = resolve; })),
      dispatchNext: vi.fn().mockResolvedValue({ status: 'idle' }),
    };
    const worker = new AnalyticsOutboxWorker(dispatcher, options);

    const first = worker.runOnce();
    await expect(worker.runOnce()).resolves.toEqual({ recovered: 0, dispatched: 0 });
    resolveRecovery(0);
    await expect(first).resolves.toEqual({ recovered: 0, dispatched: 0 });
    expect(dispatcher.recoverExpiredLeases).toHaveBeenCalledOnce();
  });
});
