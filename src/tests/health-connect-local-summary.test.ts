import { describe, expect, it, vi } from 'vitest';
import { WearableConsentState } from '../core/wearable-consent/index.ts';
import {
  readHealthConnectLocalSummary,
  type HealthConnectAggregateRecord,
} from '../../apps/mobile/src/wearable/health-connect-local-summary.ts';

const now = new Date('2026-08-18T10:00:00.000Z');
const record: HealthConnectAggregateRecord = {
  capability: 'heart_rate' as const,
  capabilityVersion: 'health-connect-aggregate-v1',
  windowStartedAt: '2026-08-18T09:55:00.000Z',
  windowEndedAt: now.toISOString(),
  generatedAt: now.toISOString(),
  quality: 'good' as const,
  confidence: 0.9,
  medianHeartRateBpm: 72,
};

function reader(overrides: Partial<{
  supported: boolean;
  aggregate: typeof record | null;
}> = {}) {
  return {
    isSupported: vi.fn(async () => overrides.supported ?? true),
    readAggregate: vi.fn(async () => overrides.aggregate === undefined ? record : overrides.aggregate),
  };
}

describe('Health Connect local summary adapter', () => {
  it('maps an approved aggregate into the versioned summary contract', async () => {
    const consent = new WearableConsentState(undefined, now);
    consent.grant(['heart_rate'], now);

    await expect(readHealthConnectLocalSummary(reader(), consent, 'heart_rate')).resolves.toMatchObject({
      status: 'summary',
      summary: {
        availability: 'available',
        measurements: { medianHeartRateBpm: 72 },
      },
    });
  });

  it('falls back without reading when consent is denied or capability is unsupported', async () => {
    const deniedReader = reader();
    await expect(readHealthConnectLocalSummary(deniedReader, new WearableConsentState(undefined, now), 'heart_rate'))
      .resolves.toEqual({ status: 'denied' });
    expect(deniedReader.readAggregate).not.toHaveBeenCalled();

    const unsupportedReader = reader({ supported: false });
    const consent = new WearableConsentState(undefined, now);
    consent.grant(['heart_rate'], now);
    await expect(readHealthConnectLocalSummary(unsupportedReader, consent, 'heart_rate'))
      .resolves.toEqual({ status: 'unsupported' });
    expect(unsupportedReader.readAggregate).not.toHaveBeenCalled();
  });

  it.each([
    ['low', 'low_quality'],
    ['stale', 'stale'],
    ['conflicting', 'conflicting'],
  ] as const)('maps %s quality to a non-physiological fallback', async (quality, availability) => {
    const consent = new WearableConsentState(undefined, now);
    consent.grant(['heart_rate'], now);
    const result = await readHealthConnectLocalSummary(reader({
      aggregate: { ...record, quality },
    }), consent, 'heart_rate');

    expect(result).toMatchObject({
      status: 'summary',
      summary: { availability, confidence: 0, measurements: {} },
    });
  });
});
