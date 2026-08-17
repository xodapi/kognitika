import { z } from 'zod';

export const PHYSIOLOGICAL_SESSION_SUMMARY_VERSION = 1 as const;
export const MAX_PHYSIOLOGICAL_SUMMARY_WINDOW_MS = 2 * 60 * 60 * 1_000;
export const PHYSIOLOGICAL_SUMMARY_STALE_AFTER_MS = 15 * 60 * 1_000;

export const PhysiologicalCapabilitySchema = z.enum([
  'heart_rate',
  'hrv_recovery',
  'sleep_activity',
  'signal_quality',
]);
export type PhysiologicalCapability = z.infer<typeof PhysiologicalCapabilitySchema>;

export const PhysiologicalAvailabilitySchema = z.enum([
  'available',
  'unavailable',
  'revoked',
  'stale',
  'low_quality',
  'conflicting',
]);
export type PhysiologicalAvailability = z.infer<typeof PhysiologicalAvailabilitySchema>;

export const PhysiologicalAggregationSchema = z.enum([
  'platform_median',
  'platform_readiness',
  'not_available',
]);

const opaqueId = z.string().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/);
const isoDate = z.string().datetime();
const summaryWindowSchema = z.object({
  startedAt: isoDate,
  endedAt: isoDate,
}).strict().superRefine((window, context) => {
  const duration = Date.parse(window.endedAt) - Date.parse(window.startedAt);
  if (duration < 0 || duration > MAX_PHYSIOLOGICAL_SUMMARY_WINDOW_MS) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endedAt'],
      message: 'Summary window must be between zero and two hours',
    });
  }
});

const measurementsSchema = z.object({
  medianHeartRateBpm: z.number().finite().min(30).max(240).optional(),
  hrvRecoveryMs: z.number().finite().min(0).max(500).optional(),
  activityReadiness: z.number().finite().min(0).max(100).optional(),
  sleepReadiness: z.number().finite().min(0).max(100).optional(),
}).strict();

/**
 * Vendor-independent, aggregate-only physiological input for an optional
 * shadow policy. It deliberately contains no device, identity, raw-sample, or
 * transport fields.
 */
export const PhysiologicalSessionSummarySchema = z.object({
  schemaVersion: z.literal(PHYSIOLOGICAL_SESSION_SUMMARY_VERSION),
  summaryId: opaqueId,
  cognitiveSessionId: opaqueId,
  capability: PhysiologicalCapabilitySchema,
  capabilityVersion: z.string().min(1).max(64).regex(/^[A-Za-z0-9._:-]+$/),
  availability: PhysiologicalAvailabilitySchema,
  confidence: z.number().finite().min(0).max(1),
  generatedAt: isoDate,
  window: summaryWindowSchema,
  aggregation: PhysiologicalAggregationSchema,
  measurements: measurementsSchema,
}).strict().superRefine((summary, context) => {
  const hasMeasurements = Object.keys(summary.measurements).length > 0;
  if (summary.availability === 'available') {
    if (!hasMeasurements) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['measurements'], message: 'Available summary requires an aggregate measurement' });
    }
    if (summary.confidence < 0.7) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['confidence'], message: 'Available summary requires confidence of at least 0.7' });
    }
    if (summary.aggregation === 'not_available') {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['aggregation'], message: 'Available summary requires an aggregation method' });
    }
  } else if (hasMeasurements || summary.confidence !== 0 || summary.aggregation !== 'not_available') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['measurements'],
      message: 'Unavailable, revoked, stale, low-quality, and conflicting summaries cannot carry physiological measurements',
    });
  }
});
export type PhysiologicalSessionSummary = z.infer<typeof PhysiologicalSessionSummarySchema>;

const FORBIDDEN_PRIVACY_KEYS = /brain.?id|email|token|jwt|password|serial|device.?id|geolocation|location|raw|sample|telemetry|answer|metadata|screenshot|user.?id/i;

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, nested]) => (
    FORBIDDEN_PRIVACY_KEYS.test(key) || containsForbiddenKey(nested)
  ));
}

export function parsePhysiologicalSessionSummary(input: unknown) {
  if (containsForbiddenKey(input)) {
    return { success: false as const, error: 'Physiological summary contains forbidden private fields' };
  }
  const parsed = PhysiologicalSessionSummarySchema.safeParse(input);
  return parsed.success
    ? { success: true as const, data: parsed.data }
    : { success: false as const, error: parsed.error.message };
}

export function isPhysiologicalSummaryUsable(
  summary: PhysiologicalSessionSummary,
  now = new Date(),
): boolean {
  return summary.availability === 'available'
    && Date.parse(now.toISOString()) - Date.parse(summary.generatedAt) <= PHYSIOLOGICAL_SUMMARY_STALE_AFTER_MS;
}
