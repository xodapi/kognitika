import {
  evaluateRustAnalyticsCanary,
  type RustAnalyticsCanaryDecision,
  type RustAnalyticsSidecarMetrics,
} from './rust-analytics-sidecar.ts';

export type AnalyticsOutboxCanaryDecision =
  | RustAnalyticsCanaryDecision
  | { eligible: false; reason: 'sidecar_metrics_unavailable' };

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

let snapshot: AnalyticsOutboxOperationalSnapshot | null = null;

export function recordAnalyticsOutboxOperationalSnapshot(value: Omit<AnalyticsOutboxOperationalSnapshot, 'canary'>) {
  snapshot = structuredClone({
    ...value,
    canary: value.sidecar
      ? evaluateRustAnalyticsCanary(value.sidecar, value.outbox)
      : { eligible: false, reason: 'sidecar_metrics_unavailable' },
  });
}

export function getAnalyticsOutboxOperationalSnapshot() {
  return snapshot ? structuredClone(snapshot) : null;
}

export function clearAnalyticsOutboxOperationalSnapshotForTests() {
  snapshot = null;
}
