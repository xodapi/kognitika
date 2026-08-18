import {
  parsePhysiologicalSessionSummary,
  type PhysiologicalCapability,
  type PhysiologicalSessionSummary,
} from '../../../../src/core/physiological-summary/index.ts';
import type { WearableConsentState } from '../../../../src/core/wearable-consent/index.ts';

export type HealthConnectQuality = 'good' | 'low' | 'stale' | 'conflicting';

export interface HealthConnectAggregateRecord {
  capability: PhysiologicalCapability;
  capabilityVersion: string;
  windowStartedAt: string;
  windowEndedAt: string;
  generatedAt: string;
  quality: HealthConnectQuality;
  confidence: number;
  medianHeartRateBpm?: number;
  hrvRecoveryMs?: number;
  activityReadiness?: number;
  sleepReadiness?: number;
}

export interface HealthConnectReader {
  isSupported(): Promise<boolean>;
  readAggregate(capability: PhysiologicalCapability): Promise<HealthConnectAggregateRecord | null>;
}

export type HealthConnectSummaryResult =
  | { status: 'summary'; summary: PhysiologicalSessionSummary }
  | { status: 'denied' | 'unsupported' | 'unavailable' | 'invalid' };

/**
 * Dependency-injected local adapter. The real Health Connect SDK is deliberately
 * not imported here; the platform integration supplies only aggregate records.
 */
export async function readHealthConnectLocalSummary(
  reader: HealthConnectReader,
  consent: WearableConsentState,
  capability: PhysiologicalCapability,
): Promise<HealthConnectSummaryResult> {
  if (!consent.hasConsentFor(capability)) return { status: 'denied' };
  if (!(await reader.isSupported())) return { status: 'unsupported' };

  const record = await reader.readAggregate(capability);
  if (!record) return { status: 'unavailable' };

  const unavailable = record.quality !== 'good';
  const input = {
    schemaVersion: 1 as const,
    summaryId: `health-connect-${record.capability}-${record.generatedAt}`,
    cognitiveSessionId: `local-cognitive-${record.windowStartedAt}`,
    capability: record.capability,
    capabilityVersion: record.capabilityVersion,
    availability: unavailable
      ? record.quality === 'low' ? 'low_quality' as const
        : record.quality === 'stale' ? 'stale' as const
          : 'conflicting' as const
      : 'available' as const,
    confidence: unavailable ? 0 : record.confidence,
    generatedAt: record.generatedAt,
    window: { startedAt: record.windowStartedAt, endedAt: record.windowEndedAt },
    aggregation: unavailable ? 'not_available' as const : 'platform_median' as const,
    measurements: unavailable ? {} : {
      ...(record.medianHeartRateBpm === undefined ? {} : { medianHeartRateBpm: record.medianHeartRateBpm }),
      ...(record.hrvRecoveryMs === undefined ? {} : { hrvRecoveryMs: record.hrvRecoveryMs }),
      ...(record.activityReadiness === undefined ? {} : { activityReadiness: record.activityReadiness }),
      ...(record.sleepReadiness === undefined ? {} : { sleepReadiness: record.sleepReadiness }),
    },
  };

  const parsed = parsePhysiologicalSessionSummary(input);
  return parsed.success
    ? { status: 'summary', summary: parsed.data }
    : { status: 'invalid' };
}
