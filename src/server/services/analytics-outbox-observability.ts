import {
  evaluateRustAnalyticsCanary,
  type RustAnalyticsCanaryDecision,
  type RustAnalyticsSidecarMetrics,
} from './rust-analytics-sidecar.ts';

export type AnalyticsOutboxCanaryDecision =
  | RustAnalyticsCanaryDecision
  | { eligible: false; reason: 'sidecar_metrics_unavailable' };

export const ANALYTICS_OUTBOX_SNAPSHOT_MAX_AGE_MS = 30_000;

export interface AnalyticsOutboxOperationalSnapshot {
  updatedAt: string;
  worker: {
    recovered: number;
    dispatched: number;
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

let snapshot: AnalyticsOutboxOperationalSnapshot | null = null;

export function recordAnalyticsOutboxOperationalSnapshot(value: Omit<AnalyticsOutboxOperationalSnapshot, 'canary'>) {
  snapshot = structuredClone({
    ...value,
    canary: value.sidecar
      ? evaluateRustAnalyticsCanary(value.sidecar, value.outbox)
      : { eligible: false, reason: 'sidecar_metrics_unavailable' },
  });
}

export function getAnalyticsOutboxOperationalSnapshot(now = new Date()) {
  if (!snapshot) return null;
  const ageMs = Math.max(0, now.getTime() - Date.parse(snapshot.updatedAt));
  const freshness: AnalyticsOutboxSnapshotFreshness = {
    ageMs,
    status: ageMs <= ANALYTICS_OUTBOX_SNAPSHOT_MAX_AGE_MS ? 'fresh' : 'stale',
  };
  return { ...structuredClone(snapshot), freshness };
}

export function clearAnalyticsOutboxOperationalSnapshotForTests() {
  snapshot = null;
}
