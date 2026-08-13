import { describe, expect, it, vi } from 'vitest';
import {
  AnalyticsOutboxWorker,
  DEFAULT_ANALYTICS_OUTBOX_WORKER_OPTIONS,
  DEFAULT_ANALYTICS_OUTBOX_COMPLETED_RETENTION_MS,
  DEFAULT_ANALYTICS_OUTBOX_METRICS_TIMEOUT_MS,
  getAnalyticsOutboxCompletedRetentionMs,
  getAnalyticsOutboxMetricsTimeoutMs,
  isAnalyticsOutboxDispatcherEnabled,
} from '../server/services/analytics-outbox-worker.ts';
import {
  ANALYTICS_OUTBOX_SNAPSHOT_MAX_AGE_MS,
  ANALYTICS_OUTBOX_SNAPSHOT_RETENTION_MS,
  clearAnalyticsOutboxOperationalSnapshotForTests,
  getAnalyticsOutboxOperationalSnapshot,
} from '../server/services/analytics-outbox-observability.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
    expect(getAnalyticsOutboxCompletedRetentionMs({})).toBeNull();
    expect(getAnalyticsOutboxCompletedRetentionMs({
      ANALYTICS_OUTBOX_RETENTION_ENABLED: 'true',
    })).toBe(DEFAULT_ANALYTICS_OUTBOX_COMPLETED_RETENTION_MS);
    expect(getAnalyticsOutboxCompletedRetentionMs({
      ANALYTICS_OUTBOX_RETENTION_ENABLED: 'true',
      ANALYTICS_OUTBOX_COMPLETED_RETENTION_DAYS: '7',
    })).toBe(7 * 24 * 60 * 60 * 1_000);
    expect(getAnalyticsOutboxCompletedRetentionMs({
      ANALYTICS_OUTBOX_RETENTION_ENABLED: 'true',
      ANALYTICS_OUTBOX_COMPLETED_RETENTION_DAYS: 'invalid',
    })).toBeNull();
    expect(getAnalyticsOutboxCompletedRetentionMs({
      ANALYTICS_OUTBOX_RETENTION_ENABLED: 'true',
      ANALYTICS_OUTBOX_COMPLETED_RETENTION_DAYS: '366',
    })).toBeNull();
    expect(getAnalyticsOutboxMetricsTimeoutMs({})).toBe(DEFAULT_ANALYTICS_OUTBOX_METRICS_TIMEOUT_MS);
    expect(getAnalyticsOutboxMetricsTimeoutMs({
      ANALYTICS_OUTBOX_METRICS_TIMEOUT_MS: '2500',
    })).toBe(2500);
    expect(getAnalyticsOutboxMetricsTimeoutMs({
      ANALYTICS_OUTBOX_METRICS_TIMEOUT_MS: '0',
    })).toBe(DEFAULT_ANALYTICS_OUTBOX_METRICS_TIMEOUT_MS);
    expect(getAnalyticsOutboxMetricsTimeoutMs({
      ANALYTICS_OUTBOX_METRICS_TIMEOUT_MS: '5001',
    })).toBe(DEFAULT_ANALYTICS_OUTBOX_METRICS_TIMEOUT_MS);
  });

  it('never passes raw dispatch errors to worker logs', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/server/services/analytics-outbox-worker.ts'), 'utf8');

    expect(source).not.toMatch(/Analytics outbox .+ failed', \{ error \}/);
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

    await expect(worker.runOnce(new Date('2026-08-04T12:00:00.000Z'))).resolves.toEqual({ recovered: 2, dispatched: 2, purged: 0 });
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
    await expect(worker.runOnce()).resolves.toEqual({ recovered: 0, dispatched: 0, purged: 0 });
    resolveRecovery(0);
    await expect(first).resolves.toEqual({ recovered: 0, dispatched: 0, purged: 0 });
    expect(dispatcher.recoverExpiredLeases).toHaveBeenCalledOnce();
  });

  it('stops scheduling and waits for an active cycle to finish', async () => {
    let resolveRecovery!: (value: number) => void;
    const dispatcher = {
      recoverExpiredLeases: vi.fn(() => new Promise<number>(resolve => { resolveRecovery = resolve; })),
      dispatchNext: vi.fn().mockResolvedValue({ status: 'idle' }),
    };
    const worker = new AnalyticsOutboxWorker(dispatcher, {
      ...options,
      intervalMs: 1,
    });
    worker.start();
    const stopped = worker.stop();
    let finished = false;
    void stopped.then(() => { finished = true; });

    await Promise.resolve();
    expect(finished).toBe(false);
    resolveRecovery(0);
    await stopped;
    expect(finished).toBe(true);
    await worker.stop();
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

    await expect(worker.runOnce(new Date('2026-08-04T12:00:00.000Z'))).resolves.toEqual({ recovered: 1, dispatched: 0, purged: 0 });

    const snapshotNow = new Date('2026-08-04T12:00:00.000Z');
    expect(getAnalyticsOutboxOperationalSnapshot(snapshotNow)).toMatchObject({
      worker: { recovered: 1, dispatched: 0, purged: 0 },
      outbox: { pending: 2, dead: 0, oldestLagMs: 500 },
      sidecar: { requests: 10, mismatched: 1 },
      canary: { eligible: false, reason: 'insufficient_samples' },
    });
    expect(JSON.stringify(getAnalyticsOutboxOperationalSnapshot(snapshotNow))).not.toMatch(/session|job|brainid|email|token|payload/i);
  });

  it('does not fail a dispatch cycle when metrics collection is unavailable', async () => {
    const dispatcher = {
      recoverExpiredLeases: vi.fn().mockResolvedValue(1),
      dispatchNext: vi.fn().mockResolvedValue({ status: 'idle' }),
      metrics: vi.fn().mockRejectedValue(new Error('metrics unavailable')),
    };
    const worker = new AnalyticsOutboxWorker(dispatcher, options);

    await expect(worker.runOnce()).resolves.toEqual({ recovered: 1, dispatched: 0, purged: 0 });
    expect(getAnalyticsOutboxOperationalSnapshot()).toBeNull();
  });

  it('does not delay dispatch completion when metrics collection times out', async () => {
    const dispatcher = {
      recoverExpiredLeases: vi.fn().mockResolvedValue(1),
      dispatchNext: vi.fn().mockResolvedValue({ status: 'idle' }),
      metrics: vi.fn().mockReturnValue(new Promise(() => undefined)),
    };
    const worker = new AnalyticsOutboxWorker(dispatcher, {
      ...options,
      metricsTimeoutMs: 1,
    });

    await expect(worker.runOnce()).resolves.toEqual({ recovered: 1, dispatched: 0, purged: 0 });
    expect(getAnalyticsOutboxOperationalSnapshot()).toBeNull();
  });

  it('purges only completed rows after explicit retention opt-in', async () => {
    const dispatcher = {
      recoverExpiredLeases: vi.fn().mockResolvedValue(0),
      dispatchNext: vi.fn().mockResolvedValue({ status: 'idle' }),
      purgeCompletedBefore: vi.fn().mockResolvedValue(3),
    };
    const worker = new AnalyticsOutboxWorker(dispatcher, {
      ...options,
      completedRetentionMs: 7 * 24 * 60 * 60 * 1_000,
    });
    const now = new Date('2026-08-04T12:00:00.000Z');

    await expect(worker.runOnce(now)).resolves.toEqual({ recovered: 0, dispatched: 0, purged: 3 });
    expect(dispatcher.purgeCompletedBefore).toHaveBeenCalledWith(
      new Date('2026-07-28T12:00:00.000Z'),
    );
  });

  it('does not fail dispatch when retention cleanup is unavailable', async () => {
    const dispatcher = {
      recoverExpiredLeases: vi.fn().mockResolvedValue(1),
      dispatchNext: vi.fn().mockResolvedValue({ status: 'idle' }),
      purgeCompletedBefore: vi.fn().mockRejectedValue(new Error('retention unavailable')),
    };
    const worker = new AnalyticsOutboxWorker(dispatcher, {
      ...options,
      completedRetentionMs: DEFAULT_ANALYTICS_OUTBOX_COMPLETED_RETENTION_MS,
    });

    await expect(worker.runOnce()).resolves.toEqual({ recovered: 1, dispatched: 0, purged: 0 });
  });

  it('marks canary readiness unavailable when shadow metrics are disabled', async () => {
    const dispatcher = {
      recoverExpiredLeases: vi.fn().mockResolvedValue(0),
      dispatchNext: vi.fn().mockResolvedValue({ status: 'idle' }),
      metrics: vi.fn().mockResolvedValue({
        pending: 0,
        processing: 0,
        retry: 0,
        completed: 0,
        dead: 0,
        oldestLagMs: 0,
        failures: 0,
      }),
    };
    const worker = new AnalyticsOutboxWorker(dispatcher, options);

    await worker.runOnce();

    expect(getAnalyticsOutboxOperationalSnapshot()?.canary).toEqual({
      eligible: false,
      reason: 'sidecar_metrics_unavailable',
    });
  });

  it('marks canary eligible only after aggregate thresholds are met', async () => {
    const dispatcher = {
      recoverExpiredLeases: vi.fn().mockResolvedValue(0),
      dispatchNext: vi.fn().mockResolvedValue({ status: 'idle' }),
      metrics: vi.fn().mockResolvedValue({
        pending: 0,
        processing: 0,
        retry: 0,
        completed: 100,
        dead: 0,
        oldestLagMs: 0,
        failures: 0,
      }),
    };
    const sidecar = {
      getMetrics: vi.fn().mockReturnValue({
        requests: 100,
        matched: 100,
        mismatched: 0,
        failures: {
          sidecar_timeout: 0,
          sidecar_unavailable: 0,
          sidecar_rejected: 0,
          sidecar_invalid_response: 0,
        },
      }),
    };
    const worker = new AnalyticsOutboxWorker(dispatcher, options, sidecar as any);

    await worker.runOnce();

    expect(getAnalyticsOutboxOperationalSnapshot()?.canary).toEqual({ eligible: true });
  });

  it('marks an operational snapshot stale after the freshness window', async () => {
    const dispatcher = {
      recoverExpiredLeases: vi.fn().mockResolvedValue(0),
      dispatchNext: vi.fn().mockResolvedValue({ status: 'idle' }),
      metrics: vi.fn().mockResolvedValue({
        pending: 0,
        processing: 0,
        retry: 0,
        completed: 0,
        dead: 0,
        oldestLagMs: 0,
        failures: 0,
      }),
    };
    const worker = new AnalyticsOutboxWorker(dispatcher, options);
    const updatedAt = new Date('2026-08-04T12:00:00.000Z');
    await worker.runOnce(updatedAt);

    expect(getAnalyticsOutboxOperationalSnapshot(new Date(
      updatedAt.getTime() + ANALYTICS_OUTBOX_SNAPSHOT_MAX_AGE_MS + 1,
    ))?.freshness).toEqual({
      ageMs: ANALYTICS_OUTBOX_SNAPSHOT_MAX_AGE_MS + 1,
      status: 'stale',
    });
  });

  it('expires an operational snapshot after the in-memory retention window', async () => {
    const dispatcher = {
      recoverExpiredLeases: vi.fn().mockResolvedValue(0),
      dispatchNext: vi.fn().mockResolvedValue({ status: 'idle' }),
      metrics: vi.fn().mockResolvedValue({
        pending: 0,
        processing: 0,
        retry: 0,
        completed: 0,
        dead: 0,
        oldestLagMs: 0,
        failures: 0,
      }),
    };
    const worker = new AnalyticsOutboxWorker(dispatcher, options);
    const updatedAt = new Date('2026-08-04T12:00:00.000Z');
    await worker.runOnce(updatedAt);

    expect(getAnalyticsOutboxOperationalSnapshot(new Date(
      updatedAt.getTime() + ANALYTICS_OUTBOX_SNAPSHOT_RETENTION_MS + 1,
    ))).toBeNull();
  });
});
