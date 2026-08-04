import { describe, expect, it } from 'vitest';
import { preflightRustAnalyticsCanary } from '../server/config/rust-analytics-canary.ts';

const readyEnvironment = {
  ANALYTICS_OUTBOX_SHADOW_ENABLED: 'true',
  ANALYTICS_OUTBOX_DISPATCH_ENABLED: 'true',
  RUST_ANALYTICS_SIDECAR_ENABLED: 'true',
  RUST_ANALYTICS_SIDECAR_URL: 'http://analytics-sidecar:3010',
  RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT: '0',
};

describe('Rust analytics canary preflight', () => {
  it('requires every independent safety switch before a zero-percent dev preflight', () => {
    expect(preflightRustAnalyticsCanary(readyEnvironment)).toEqual({ ready: true, rolloutPercent: 0 });
    expect(preflightRustAnalyticsCanary({ ...readyEnvironment, ANALYTICS_OUTBOX_SHADOW_ENABLED: 'false' })).toEqual({ ready: false, reason: 'outbox_disabled' });
    expect(preflightRustAnalyticsCanary({ ...readyEnvironment, ANALYTICS_OUTBOX_DISPATCH_ENABLED: 'false' })).toEqual({ ready: false, reason: 'dispatcher_disabled' });
    expect(preflightRustAnalyticsCanary({ ...readyEnvironment, RUST_ANALYTICS_SIDECAR_ENABLED: 'false' })).toEqual({ ready: false, reason: 'sidecar_disabled' });
    expect(preflightRustAnalyticsCanary({ ...readyEnvironment, RUST_ANALYTICS_SIDECAR_URL: '' })).toEqual({ ready: false, reason: 'sidecar_url_missing' });
  });

  it('accepts a bounded rollout and rejects malformed rollback configuration', () => {
    expect(preflightRustAnalyticsCanary({ ...readyEnvironment, RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT: '1' })).toEqual({ ready: true, rolloutPercent: 1 });
    for (const rollout of ['-1', '101', '1.5', 'not-a-number']) {
      expect(preflightRustAnalyticsCanary({ ...readyEnvironment, RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT: rollout })).toEqual({ ready: false, reason: 'invalid_rollout' });
    }
  });
});
