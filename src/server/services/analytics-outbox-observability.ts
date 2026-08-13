import {
  evaluateRustAnalyticsCanary,
  type RustAnalyticsCanaryDecision,
  type RustAnalyticsSidecarMetrics,
} from './rust-analytics-sidecar.ts';

export type AnalyticsOutboxCanaryDecision =
  | RustAnalyticsCanaryDecision
  | { eligible: false; reason: 'sidecar_metrics_unavailable' };

export const ANALYTICS_OUTBOX_SNAPSHOT_MAX_AGE_MS = 30_000;
export const ANALYTICS_OUTBOX_SNAPSHOT_RETENTION_MS = 5 * 60_000;

export interface AnalyticsOutboxOperationalSnapshot {
  updatedAt: string;
  worker: {
    recovered: number;
    dispatched: number;
    purged: number;
  };
  outbox: {
    pending: number;
    processing: number;
    retry: number;
    completed: number;
    dead: number;
    oldestLagMs: number;
    failures: number;
  };
  sidecar: RustAnalyticsSidecarMetrics | null;
  canary: AnalyticsOutboxCanaryDecision;
}

export interface AnalyticsOutboxSnapshotFreshness {
  ageMs: number;
  status: 'fresh' | 'stale';
}

export type AnalyticsOutboxOperationalSnapshotView =
  AnalyticsOutboxOperationalSnapshot & { freshness: AnalyticsOutboxSnapshotFreshness };

let snapshot: AnalyticsOutboxOperationalSnapshot | null = null;

export function recordAnalyticsOutboxOperationalSnapshot(value: Omit<AnalyticsOutboxOperationalSnapshot, 'canary'>) {
  snapshot = structuredClone({
    ...value,
    canary: value.sidecar
      ? evaluateRustAnalyticsCanary(value.sidecar, value.outbox)
      : { eligible: false, reason: 'sidecar_metrics_unavailable' },
  });
}

export function getAnalyticsOutboxOperationalSnapshot(now = new Date()): AnalyticsOutboxOperationalSnapshotView | null {
  if (!snapshot) return null;
  const updatedAtMs = Date.parse(snapshot.updatedAt);
  const nowMs = now.getTime();
  if (!Number.isFinite(updatedAtMs) || !Number.isFinite(nowMs)) return null;
  const ageMs = Math.max(0, nowMs - updatedAtMs);
  if (ageMs > ANALYTICS_OUTBOX_SNAPSHOT_RETENTION_MS) return null;
  const freshness: AnalyticsOutboxSnapshotFreshness = {
    ageMs,
    status: ageMs <= ANALYTICS_OUTBOX_SNAPSHOT_MAX_AGE_MS ? 'fresh' : 'stale',
  };
  return { ...structuredClone(snapshot), freshness };
}

export function clearAnalyticsOutboxOperationalSnapshotForTests() {
  snapshot = null;
}
