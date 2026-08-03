import { describe, expect, it } from 'vitest';
import {
  WEARABLE_CONSENT_CONTRACT_VERSION,
  WearableConsentState,
  parseWearableConsent,
} from '../core/wearable-consent/index.ts';

const now = new Date('2026-08-03T00:00:00.000Z');

function grantedConsent() {
  return {
    contractVersion: WEARABLE_CONSENT_CONTRACT_VERSION,
    status: 'granted' as const,
    categories: ['heart_rate', 'signal_quality'] as const,
    updatedAt: now.toISOString(),
  };
}

describe('wearable consent privacy contract', () => {
  it('requires explicit, granular consent before a category is available', () => {
    const consent = new WearableConsentState(undefined, now);
    expect(consent.hasConsentFor('heart_rate')).toBe(false);

    consent.grant(['heart_rate', 'signal_quality'], now);
    expect(consent.hasConsentFor('heart_rate')).toBe(true);
    expect(consent.hasConsentFor('hrv_recovery')).toBe(false);
  });

  it('preserves cognitive-only fallback when consent is denied or revoked', () => {
    const consent = new WearableConsentState(undefined, now);
    expect(consent.current()).toMatchObject({ status: 'denied', categories: [] });

    consent.grant(['sleep_activity'], now);
    expect(consent.revoke(now)).toMatchObject({ status: 'revoked', categories: [] });
    expect(consent.hasConsentFor('sleep_activity')).toBe(false);
    expect(consent.deny(now)).toMatchObject({ status: 'denied', categories: [] });
  });

  it('accepts a versioned, minimized synthetic consent record', () => {
    expect(parseWearableConsent(grantedConsent())).toEqual({ success: true, data: grantedConsent() });
  });

  it.each([
    ['empty grant', { ...grantedConsent(), categories: [] }],
    ['duplicate category', { ...grantedConsent(), categories: ['heart_rate', 'heart_rate'] }],
    ['categories after revoke', { ...grantedConsent(), status: 'revoked', categories: ['heart_rate'] }],
    ['unsupported version', { ...grantedConsent(), contractVersion: 2 }],
  ])('rejects %s', (_label, input) => {
    expect(parseWearableConsent(input).success).toBe(false);
  });

  it.each([
    ['brain ID', { ...grantedConsent(), brainId: 'synthetic-brain-id' }],
    ['JWT', { ...grantedConsent(), token: 'synthetic-token' }],
    ['device serial', { ...grantedConsent(), deviceSerial: 'synthetic-device-serial' }],
    ['raw samples', { ...grantedConsent(), rawTelemetry: [{ bpm: 70 }] }],
    ['nested email', { ...grantedConsent(), extra: { email: 'synthetic@example.test' } }],
  ])('rejects private material: %s', (_label, input) => {
    expect(parseWearableConsent(input).success).toBe(false);
  });

  it('models local export and deletion requests without payload delivery', () => {
    const consent = new WearableConsentState(undefined, now);
    expect(consent.requestPrivacyAction('export_requested')).toBe('export_requested');
    expect(consent.requestPrivacyAction('deletion_requested')).toBe('deletion_requested');
  });
});
