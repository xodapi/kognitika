import type { RustAnalyticsSidecarMetrics } from './rust-analytics-sidecar.ts';

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
}

let snapshot: AnalyticsOutboxOperationalSnapshot | null = null;

export function recordAnalyticsOutboxOperationalSnapshot(value: AnalyticsOutboxOperationalSnapshot) {
  snapshot = structuredClone(value);
}

export function getAnalyticsOutboxOperationalSnapshot() {
  return snapshot ? structuredClone(snapshot) : null;
}

export function clearAnalyticsOutboxOperationalSnapshotForTests() {
  snapshot = null;
}
