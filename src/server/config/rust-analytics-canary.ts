export interface RustAnalyticsCanaryEnvironment {
  ANALYTICS_OUTBOX_SHADOW_ENABLED?: string;
  ANALYTICS_OUTBOX_DISPATCH_ENABLED?: string;
  RUST_ANALYTICS_SIDECAR_ENABLED?: string;
  RUST_ANALYTICS_SIDECAR_URL?: string;
  RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT?: string;
}

export type RustAnalyticsCanaryPreflight =
  | { ready: true; rolloutPercent: number }
  | { ready: false; reason: 'invalid_rollout' | 'outbox_disabled' | 'dispatcher_disabled' | 'sidecar_disabled' | 'sidecar_url_missing' };

function parseRolloutPercent(value: string | undefined) {
  const parsed = Number(value ?? '0');
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}

export function preflightRustAnalyticsCanary(
  environment: RustAnalyticsCanaryEnvironment = process.env,
): RustAnalyticsCanaryPreflight {
  const rolloutPercent = parseRolloutPercent(environment.RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT);
  if (rolloutPercent === null) return { ready: false, reason: 'invalid_rollout' };
  if (environment.ANALYTICS_OUTBOX_SHADOW_ENABLED !== 'true') return { ready: false, reason: 'outbox_disabled' };
  if (environment.ANALYTICS_OUTBOX_DISPATCH_ENABLED !== 'true') return { ready: false, reason: 'dispatcher_disabled' };
  if (environment.RUST_ANALYTICS_SIDECAR_ENABLED !== 'true') return { ready: false, reason: 'sidecar_disabled' };
  if (!environment.RUST_ANALYTICS_SIDECAR_URL) return { ready: false, reason: 'sidecar_url_missing' };
  return { ready: true, rolloutPercent };
}
