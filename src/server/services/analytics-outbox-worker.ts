import { createSafeLogger } from '../../lib/safe-logger.ts';
import { PrismaAnalyticsOutboxStore } from '../infrastructure/prisma/prisma-analytics-outbox-store.ts';
import { createRustAnalyticsSidecarClient, type RustAnalyticsSidecarClient } from './rust-analytics-sidecar.ts';
import { recordAnalyticsOutboxOperationalSnapshot } from './analytics-outbox-observability.ts';

const logger = createSafeLogger('analytics-outbox-worker');

export interface AnalyticsOutboxDispatcher {
  recoverExpiredLeases(now: Date, maxAttempts: number): Promise<number>;
  purgeCompletedBefore?(cutoff: Date): Promise<number>;
  metrics?(now: Date): Promise<{
    pending: number;
    processing: number;
    retry: number;
    completed: number;
    dead: number;
    oldestLagMs: number;
    failures: number;
  }>;
  dispatchNext(options: {
    workerId: string;
    now: Date;
    leaseMs: number;
    maxAttempts: number;
  }): Promise<{ status: 'idle' | 'skipped' | 'completed' | 'failed' }>;
}

export interface AnalyticsOutboxWorkerOptions {
  workerId: string;
  intervalMs: number;
  batchSize: number;
  leaseMs: number;
  maxAttempts: number;
  completedRetentionMs?: number;
}

export const DEFAULT_ANALYTICS_OUTBOX_WORKER_OPTIONS: Omit<AnalyticsOutboxWorkerOptions, 'workerId'> = {
  intervalMs: 5_000,
  batchSize: 10,
  leaseMs: 30_000,
  maxAttempts: 3,
};

export const DEFAULT_ANALYTICS_OUTBOX_COMPLETED_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

export function isAnalyticsOutboxDispatcherEnabled(environment: Record<string, string | undefined> = process.env): boolean {
  return environment.ANALYTICS_OUTBOX_DISPATCH_ENABLED === 'true';
}

export function getAnalyticsOutboxCompletedRetentionMs(environment: Record<string, string | undefined> = process.env): number | null {
  if (environment.ANALYTICS_OUTBOX_RETENTION_ENABLED !== 'true') return null;
  const configuredDays = Number(environment.ANALYTICS_OUTBOX_COMPLETED_RETENTION_DAYS);
  const retentionDays = Number.isInteger(configuredDays) && configuredDays > 0 ? configuredDays : 30;
  return retentionDays * 24 * 60 * 60 * 1_000;
}

export class AnalyticsOutboxWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly dispatcher: AnalyticsOutboxDispatcher,
    private readonly options: AnalyticsOutboxWorkerOptions,
    private readonly rustSidecar: RustAnalyticsSidecarClient | null = null,
  ) {}

  async runOnce(now = new Date()): Promise<{ recovered: number; dispatched: number; purged: number }> {
    if (this.running) return { recovered: 0, dispatched: 0, purged: 0 };
    this.running = true;
    try {
      const recovered = await this.dispatcher.recoverExpiredLeases(now, this.options.maxAttempts);
      let dispatched = 0;
      for (let index = 0; index < this.options.batchSize; index += 1) {
        try {
          const result = await this.dispatcher.dispatchNext({
            workerId: this.options.workerId,
            now: new Date(),
            leaseMs: this.options.leaseMs,
            maxAttempts: this.options.maxAttempts,
          });
          if (result.status === 'idle') break;
          dispatched += 1;
        } catch (error) {
          logger.error('Analytics outbox dispatch cycle failed', { error });
          break;
        }
      }
      let purged = 0;
      try {
        purged = await this.purgeCompleted(now);
      } catch (error) {
        logger.warn('Analytics outbox retention cleanup failed', { error });
      }
      const result = { recovered, dispatched, purged };
      try {
        await this.recordOperationalSnapshot(result, now);
      } catch (error) {
        logger.warn('Analytics outbox metrics snapshot failed', { error });
      }
      return result;
    } catch (error) {
      logger.error('Analytics outbox recovery failed', { error });
      return { recovered: 0, dispatched: 0, purged: 0 };
    } finally {
      this.running = false;
    }
  }

  private async purgeCompleted(now: Date): Promise<number> {
    if (!this.dispatcher.purgeCompletedBefore || !this.options.completedRetentionMs) return 0;
    return this.dispatcher.purgeCompletedBefore(new Date(now.getTime() - this.options.completedRetentionMs));
  }

  private async recordOperationalSnapshot(result: { recovered: number; dispatched: number; purged: number }, now: Date) {
    if (!this.dispatcher.metrics) return;
    const outbox = await this.dispatcher.metrics(now);
    recordAnalyticsOutboxOperationalSnapshot({
      updatedAt: now.toISOString(),
      worker: result,
      outbox,
      sidecar: this.rustSidecar?.getMetrics() ?? null,
    });
  }

  start() {
    if (this.timer) return;
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), this.options.intervalMs);
    this.timer.unref?.();
    logger.info('Analytics outbox worker enabled', {
      intervalMs: this.options.intervalMs,
      batchSize: this.options.batchSize,
      leaseMs: this.options.leaseMs,
      maxAttempts: this.options.maxAttempts,
    });
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}

export function startAnalyticsOutboxWorker(environment: Record<string, string | undefined> = process.env) {
  if (!isAnalyticsOutboxDispatcherEnabled(environment)) return null;
  const rustSidecar = createRustAnalyticsSidecarClient(environment);
  const completedRetentionMs = getAnalyticsOutboxCompletedRetentionMs(environment);
  const worker = new AnalyticsOutboxWorker(
    new PrismaAnalyticsOutboxStore(rustSidecar),
    {
      ...DEFAULT_ANALYTICS_OUTBOX_WORKER_OPTIONS,
      workerId: `node-${process.pid}`,
      ...(completedRetentionMs !== null
        ? { completedRetentionMs }
        : {}),
    },
    rustSidecar,
  );
  worker.start();
  return worker;
}
