export const ANALYTICS_OUTBOX_FEATURE_FLAG = 'ANALYTICS_OUTBOX_SHADOW_ENABLED' as const;

export type AnalyticsOutboxState = 'pending' | 'processing' | 'retry' | 'completed' | 'dead';
export type AnalyticsOutboxAuthority = 'typescript';
export type AnalyticsOutboxShadowCandidate = 'rust';

export interface AnalyticsOutboxEntry {
  id: string;
  sourceSession: string;
  analyzerVersion: string;
  contractVersion: string;
  idempotencyKey: string;
  occurredAt: Date;
  state: AnalyticsOutboxState;
  attemptCount: number;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
  completedAt?: Date;
  lastErrorCode?: 'analyzer_unavailable' | 'invalid_canonical_job' | 'lease_expired' | 'unknown';
  authority: AnalyticsOutboxAuthority;
  shadowCandidate: AnalyticsOutboxShadowCandidate;
}

export interface CreateAnalyticsOutboxEntryInput {
  sourceSession: string;
  analyzerVersion: string;
  contractVersion: string;
  occurredAt: Date;
}

export function createAnalyticsOutboxEntry(input: CreateAnalyticsOutboxEntryInput): AnalyticsOutboxEntry {
  const idempotencyKey = `${input.sourceSession}:${input.analyzerVersion}:${input.contractVersion}`;
  return {
    id: `analytics-outbox-${idempotencyKey}`,
    ...input,
    idempotencyKey,
    state: 'pending',
    attemptCount: 0,
    leaseOwner: null,
    leaseExpiresAt: null,
    authority: 'typescript',
    shadowCandidate: 'rust',
  };
}

export interface AnalyticsOutboxStore {
  all(): AnalyticsOutboxEntry[];
  claimNext(workerId: string, now: Date, leaseMs: number): AnalyticsOutboxEntry | null;
  update(entry: AnalyticsOutboxEntry): void;
}

export class InMemoryAnalyticsOutboxStore implements AnalyticsOutboxStore {
  private readonly entries = new Map<string, AnalyticsOutboxEntry>();

  constructor(entries: AnalyticsOutboxEntry[] = []) {
    entries.forEach(entry => this.entries.set(entry.id, { ...entry }));
  }

  all() {
    return [...this.entries.values()];
  }

  claimNext(workerId: string, now: Date, leaseMs: number): AnalyticsOutboxEntry | null {
    for (const entry of this.entries.values()) {
      if (entry.state !== 'pending' && entry.state !== 'retry') continue;
      const claimed = {
        ...entry,
        state: 'processing' as const,
        leaseOwner: workerId,
        leaseExpiresAt: new Date(now.getTime() + leaseMs),
      };
      this.entries.set(claimed.id, claimed);
      return { ...claimed };
    }
    return null;
  }

  update(entry: AnalyticsOutboxEntry) {
    this.entries.set(entry.id, { ...entry });
  }
}

export class AnalyticsOutboxStateMachine {
  constructor(private readonly store: AnalyticsOutboxStore, private readonly options: { maxAttempts: number; leaseMs: number }) {}

  claim(workerId: string, now: Date): AnalyticsOutboxEntry | null {
    return this.store.claimNext(workerId, now, this.options.leaseMs);
  }

  complete(id: string, workerId: string, now: Date): AnalyticsOutboxEntry | null {
    const entry = this.processingEntry(id, workerId, now);
    if (!entry) return null;
    const completed = { ...entry, state: 'completed' as const, leaseOwner: null, leaseExpiresAt: null, completedAt: now };
    this.store.update(completed);
    return completed;
  }

  fail(id: string, workerId: string, now: Date, errorCode: string): AnalyticsOutboxEntry | null {
    const entry = this.processingEntry(id, workerId, now);
    if (!entry) return null;
    const attemptCount = entry.attemptCount + 1;
    const failed = {
      ...entry,
      attemptCount,
      state: (attemptCount >= this.options.maxAttempts ? 'dead' : 'retry') as 'dead' | 'retry',
      leaseOwner: null,
      leaseExpiresAt: null,
      lastErrorCode: errorCode === 'analyzer unavailable'
        ? 'analyzer_unavailable' as const
        : errorCode === 'invalid canonical job'
          ? 'invalid_canonical_job' as const
          : 'unknown' as const,
    };
    this.store.update(failed);
    return failed;
  }

  recoverExpiredLeases(now: Date): number {
    let recovered = 0;
    for (const entry of this.store.all()) {
      if (entry.state === 'processing' && entry.leaseExpiresAt && entry.leaseExpiresAt <= now) {
        const attemptCount = entry.attemptCount + 1;
        this.store.update({
          ...entry,
          attemptCount,
          state: attemptCount >= this.options.maxAttempts ? 'dead' : 'retry',
          leaseOwner: null,
          leaseExpiresAt: null,
          lastErrorCode: 'lease_expired',
        });
        recovered += 1;
      }
    }
    return recovered;
  }

  private processingEntry(id: string, workerId: string, now: Date) {
    const entry = this.store.all().find(candidate => candidate.id === id);
    return entry?.state === 'processing'
      && entry.leaseOwner === workerId
      && entry.leaseExpiresAt !== null
      && entry.leaseExpiresAt > now
      ? entry
      : null;
  }
}

export interface GameSaveOutboxTransaction {
  saveGame(): Promise<{ sourceSession: string }>;
  insertOutbox(entry: AnalyticsOutboxEntry): Promise<void>;
}

export interface GameSaveOutboxWriter {
  transaction<T>(work: (transaction: GameSaveOutboxTransaction) => Promise<T>): Promise<T>;
}

export async function saveGameWithAnalyticsOutbox(
  writer: GameSaveOutboxWriter,
  input: Omit<CreateAnalyticsOutboxEntryInput, 'sourceSession'> & { enabled?: boolean },
): Promise<{ sourceSession: string; outboxQueued: boolean }> {
  return writer.transaction(async transaction => {
    const game = await transaction.saveGame();
    if (input.enabled === false) return { ...game, outboxQueued: false };
    await transaction.insertOutbox(createAnalyticsOutboxEntry({ ...input, sourceSession: game.sourceSession }));
    return { ...game, outboxQueued: true };
  });
}

export function isAnalyticsOutboxEnabled(environment: Record<string, string | undefined> = process.env): boolean {
  return environment[ANALYTICS_OUTBOX_FEATURE_FLAG] === 'true';
}

export interface AnalyticsOutboxMetricsEntry {
  occurredAt: Date;
  state: AnalyticsOutboxState;
}

export function buildAnalyticsOutboxMetrics(entries: readonly AnalyticsOutboxMetricsEntry[], now: Date) {
  const metrics = { pending: 0, processing: 0, retry: 0, completed: 0, dead: 0, oldestLagMs: 0, failures: 0 };
  for (const entry of entries) {
    metrics[entry.state] += 1;
    if (entry.state === 'pending' || entry.state === 'retry') {
      metrics.oldestLagMs = Math.max(metrics.oldestLagMs, now.getTime() - entry.occurredAt.getTime());
    }
    if (entry.state === 'dead') metrics.failures += 1;
  }
  return metrics;
}
