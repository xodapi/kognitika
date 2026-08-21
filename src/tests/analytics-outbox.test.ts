import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_OUTBOX_FEATURE_FLAG,
  AnalyticsOutboxStateMachine,
  InMemoryAnalyticsOutboxStore,
  buildAnalyticsOutboxMetrics,
  createAnalyticsOutboxEntry,
  isAnalyticsOutboxEnabled,
  saveGameWithAnalyticsOutbox,
} from '../core/analytics-outbox/index.ts';

describe('durable analytics outbox contract', () => {
  const now = new Date('2026-08-02T10:00:00.000Z');
  const createEntry = () => createAnalyticsOutboxEntry({
    sourceSession: 'session-synthetic-001',
    analyzerVersion: 'rust-shadow-v1',
    contractVersion: 'analytics-contract-v1',
    occurredAt: now,
  });

  it('requires game persistence and outbox insertion in one writer transaction', async () => {
    const calls: string[] = [];
    const result = await saveGameWithAnalyticsOutbox({
      async transaction(work) {
        calls.push('begin');
        const result = await work({
          async saveGame() { calls.push('save'); return { sourceSession: 'session-synthetic-001' }; },
          async insertOutbox(entry) { calls.push(`outbox:${entry.idempotencyKey}`); },
        });
        calls.push('commit');
        return result;
      },
    }, { analyzerVersion: 'rust-shadow-v1', contractVersion: 'analytics-contract-v1', occurredAt: now });

    expect(result.outboxQueued).toBe(true);
    expect(calls).toEqual(['begin', 'save', 'outbox:session-synthetic-001:rust-shadow-v1:analytics-contract-v1', 'commit']);
  });

  it('does not delay or fail a successful game save when shadow analytics is disabled', async () => {
    let inserted = false;
    const result = await saveGameWithAnalyticsOutbox({
      async transaction(work) {
        return work({
          async saveGame() { return { sourceSession: 'session-synthetic-001' }; },
          async insertOutbox() { inserted = true; },
        });
      },
    }, { analyzerVersion: 'rust-shadow-v1', contractVersion: 'analytics-contract-v1', occurredAt: now, enabled: false });

    expect(result).toEqual({ sourceSession: 'session-synthetic-001', outboxQueued: false });
    expect(inserted).toBe(false);
  });

  it('uses sourceSession, analyzerVersion, and contractVersion as the idempotency key', () => {
    expect(createEntry().idempotencyKey).toBe('session-synthetic-001:rust-shadow-v1:analytics-contract-v1');
  });

  it('atomically leases a job to only one competing worker', () => {
    const store = new InMemoryAnalyticsOutboxStore([createEntry()]);
    const machine = new AnalyticsOutboxStateMachine(store, { maxAttempts: 2, leaseMs: 1_000 });

    const [first, second] = [machine.claim('worker-a', now), machine.claim('worker-b', now)];

    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(store.all()[0]).toMatchObject({ state: 'processing', leaseOwner: 'worker-a' });
  });

  it('leases, retries, rejects expired workers, recovers timeouts, and dead-letters bounded failures', () => {
    const store = new InMemoryAnalyticsOutboxStore([createEntry()]);
    const machine = new AnalyticsOutboxStateMachine(store, { maxAttempts: 2, leaseMs: 1_000 });
    const first = machine.claim('worker-a', now);
    expect(first?.state).toBe('processing');
    expect(machine.fail(first!.id, 'worker-a', now, 'analyzer unavailable')?.state).toBe('retry');

    const second = machine.claim('worker-b', new Date(now.getTime() + 1));
    expect(machine.fail(second!.id, 'worker-b', new Date(now.getTime() + 1), 'analyzer unavailable')?.state).toBe('dead');

    const recoveryStore = new InMemoryAnalyticsOutboxStore([createEntry()]);
    const recoveryMachine = new AnalyticsOutboxStateMachine(recoveryStore, { maxAttempts: 2, leaseMs: 1_000 });
    const expired = recoveryMachine.claim('worker-a', now)!;
    const afterExpiry = new Date(now.getTime() + 1_001);
    expect(recoveryMachine.complete(expired.id, 'worker-a', afterExpiry)).toBeNull();
    expect(recoveryMachine.fail(expired.id, 'worker-a', afterExpiry, 'analyzer unavailable')).toBeNull();
    expect(recoveryMachine.recoverExpiredLeases(afterExpiry)).toBe(1);
    expect(recoveryStore.all()[0]).toMatchObject({ state: 'retry', attemptCount: 1, leaseOwner: null, leaseExpiresAt: null });
  });

  it('dead-letters a repeatedly expired lease within the bounded retry budget', () => {
    const store = new InMemoryAnalyticsOutboxStore([createEntry()]);
    const machine = new AnalyticsOutboxStateMachine(store, { maxAttempts: 1, leaseMs: 1_000 });
    machine.claim('worker-a', now);

    expect(machine.recoverExpiredLeases(new Date(now.getTime() + 1_001))).toBe(1);
    expect(store.all()[0]).toMatchObject({ state: 'dead', attemptCount: 1, lastErrorCode: 'lease_expired' });
  });

  it('keeps TS authority separate from a Rust shadow candidate and exposes privacy-safe metrics', () => {
    const entry = createEntry();
    expect(entry).not.toHaveProperty('brainId');
    expect(JSON.stringify(entry)).not.toMatch(/brainId|jwt|email|localStorage|rawStorage|telemetry/i);

    const metrics = buildAnalyticsOutboxMetrics([
      entry,
      { occurredAt: entry.occurredAt, state: 'dead' },
    ], now);
    expect(metrics).toEqual({ pending: 1, processing: 0, retry: 0, completed: 0, dead: 1, oldestLagMs: 0, failures: 1 });
    expect(entry.authority).toBe('typescript');
    expect(entry.shadowCandidate).toBe('rust');
  });

  it('uses a feature flag for rollout and rollback', () => {
    expect(ANALYTICS_OUTBOX_FEATURE_FLAG).toBe('ANALYTICS_OUTBOX_SHADOW_ENABLED');
    expect(isAnalyticsOutboxEnabled({ ANALYTICS_OUTBOX_SHADOW_ENABLED: 'true' })).toBe(true);
    expect(isAnalyticsOutboxEnabled({ ANALYTICS_OUTBOX_SHADOW_ENABLED: 'false' })).toBe(false);
  });
});
