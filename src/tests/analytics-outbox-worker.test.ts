import { describe, expect, it, vi } from 'vitest';
import {
  AnalyticsOutboxWorker,
  DEFAULT_ANALYTICS_OUTBOX_WORKER_OPTIONS,
  isAnalyticsOutboxDispatcherEnabled,
} from '../server/services/analytics-outbox-worker.ts';
import {
  clearAnalyticsOutboxOperationalSnapshotForTests,
  getAnalyticsOutboxOperationalSnapshot,
} from '../server/services/analytics-outbox-observability.ts';

describe('analytics outbox worker', () => {
  const options = {
    ...DEFAULT_ANALYTICS_OUTBOX_WORKER_OPTIONS,
    workerId: 'node-test-worker',
  };

  afterEach(() => {
    clearAnalyticsOutboxOperationalSnapshotForTests();
  });

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

  it('records aggregate-only outbox and sidecar metrics without affecting dispatch', async () => {
    const dispatcher = {
      recoverExpiredLeases: vi.fn().mockResolvedValue(1),
      dispatchNext: vi.fn().mockResolvedValue({ status: 'idle' }),
      metrics: vi.fn().mockResolvedValue({
        pending: 2,
        processing: 1,
        retry: 3,
        completed: 4,
        dead: 0,
        oldestLagMs: 500,
        failures: 0,
      }),
    };
    const sidecar = {
      getMetrics: vi.fn().mockReturnValue({
        requests: 10,
        matched: 9,
        mismatched: 1,
        failures: {
          sidecar_timeout: 0,
          sidecar_unavailable: 0,
          sidecar_rejected: 0,
          sidecar_invalid_response: 0,
        },
      }),
    };
    const worker = new AnalyticsOutboxWorker(dispatcher, options, sidecar as any);

    await expect(worker.runOnce(new Date('2026-08-04T12:00:00.000Z'))).resolves.toEqual({ recovered: 1, dispatched: 0 });

    expect(getAnalyticsOutboxOperationalSnapshot()).toMatchObject({
      worker: { recovered: 1, dispatched: 0 },
      outbox: { pending: 2, dead: 0, oldestLagMs: 500 },
      sidecar: { requests: 10, mismatched: 1 },
    });
    expect(JSON.stringify(getAnalyticsOutboxOperationalSnapshot())).not.toMatch(/session|job|brainid|email|token|payload/i);
  });

  it('does not fail a dispatch cycle when metrics collection is unavailable', async () => {
    const dispatcher = {
      recoverExpiredLeases: vi.fn().mockResolvedValue(1),
      dispatchNext: vi.fn().mockResolvedValue({ status: 'idle' }),
      metrics: vi.fn().mockRejectedValue(new Error('metrics unavailable')),
    };
    const worker = new AnalyticsOutboxWorker(dispatcher, options);

    await expect(worker.runOnce()).resolves.toEqual({ recovered: 1, dispatched: 0 });
    expect(getAnalyticsOutboxOperationalSnapshot()).toBeNull();
  });
});
