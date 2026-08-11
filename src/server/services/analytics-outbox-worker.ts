import { createSafeLogger } from '../../lib/safe-logger.ts';
import { PrismaAnalyticsOutboxStore } from '../infrastructure/prisma/prisma-analytics-outbox-store.ts';
import { createRustAnalyticsSidecarClient } from './rust-analytics-sidecar.ts';

const logger = createSafeLogger('analytics-outbox-worker');

export interface AnalyticsOutboxDispatcher {
  recoverExpiredLeases(now: Date, maxAttempts: number): Promise<number>;
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
}

export const DEFAULT_ANALYTICS_OUTBOX_WORKER_OPTIONS: Omit<AnalyticsOutboxWorkerOptions, 'workerId'> = {
  intervalMs: 5_000,
  batchSize: 10,
  leaseMs: 30_000,
  maxAttempts: 3,
};

export function isAnalyticsOutboxDispatcherEnabled(environment: Record<string, string | undefined> = process.env): boolean {
  return environment.ANALYTICS_OUTBOX_DISPATCH_ENABLED === 'true';
}

export class AnalyticsOutboxWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly dispatcher: AnalyticsOutboxDispatcher,
    private readonly options: AnalyticsOutboxWorkerOptions,
  ) {}

  async runOnce(now = new Date()): Promise<{ recovered: number; dispatched: number }> {
    if (this.running) return { recovered: 0, dispatched: 0 };
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
      return { recovered, dispatched };
    } catch (error) {
      logger.error('Analytics outbox recovery failed', { error });
      return { recovered: 0, dispatched: 0 };
    } finally {
      this.running = false;
    }
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
  const worker = new AnalyticsOutboxWorker(
    new PrismaAnalyticsOutboxStore(createRustAnalyticsSidecarClient(environment)),
    {
      ...DEFAULT_ANALYTICS_OUTBOX_WORKER_OPTIONS,
      workerId: `node-${process.pid}`,
    },
  );
  worker.start();
  return worker;
}
