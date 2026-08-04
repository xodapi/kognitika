import { z } from 'zod';

export const WEARABLE_CONSENT_CONTRACT_VERSION = 1 as const;

export const WearableSignalCategorySchema = z.enum([
  'heart_rate',
  'hrv_recovery',
  'sleep_activity',
  'signal_quality',
]);
export type WearableSignalCategory = z.infer<typeof WearableSignalCategorySchema>;

export const WearableConsentStatusSchema = z.enum(['granted', 'denied', 'revoked']);
export type WearableConsentStatus = z.infer<typeof WearableConsentStatusSchema>;

export const WearablePrivacyRequestSchema = z.enum(['export_requested', 'deletion_requested']);
export type WearablePrivacyRequest = z.infer<typeof WearablePrivacyRequestSchema>;

export const WearableConsentRecordSchema = z.object({
  contractVersion: z.literal(WEARABLE_CONSENT_CONTRACT_VERSION),
  status: WearableConsentStatusSchema,
  categories: z.array(WearableSignalCategorySchema).max(4),
  updatedAt: z.string().datetime(),
}).strict().superRefine((record, context) => {
  if (record.status === 'granted' && record.categories.length === 0) {
    context.addIssue({ code: 'custom', path: ['categories'], message: 'Granted consent requires at least one category' });
  }
  if (record.status !== 'granted' && record.categories.length > 0) {
    context.addIssue({ code: 'custom', path: ['categories'], message: 'Only granted consent may retain categories' });
  }
  if (new Set(record.categories).size !== record.categories.length) {
    context.addIssue({ code: 'custom', path: ['categories'], message: 'Consent categories must be unique' });
  }
});
export type WearableConsentRecord = z.infer<typeof WearableConsentRecordSchema>;

const FORBIDDEN_PRIVACY_KEYS = /brain.?id|email|token|jwt|password|serial|device.?id|geolocation|location|raw|telemetry|answers|metadata|screenshot/i;

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, nested]) => FORBIDDEN_PRIVACY_KEYS.test(key) || containsForbiddenKey(nested));
}

export function parseWearableConsent(input: unknown) {
  if (containsForbiddenKey(input)) {
    return { success: false as const, error: 'Wearable consent contains forbidden private fields' };
  }
  const parsed = WearableConsentRecordSchema.safeParse(input);
  return parsed.success
    ? { success: true as const, data: parsed.data }
    : { success: false as const, error: parsed.error.message };
}

function deniedRecord(now: Date): WearableConsentRecord {
  return {
    contractVersion: WEARABLE_CONSENT_CONTRACT_VERSION,
    status: 'denied',
    categories: [],
    updatedAt: now.toISOString(),
  };
}

/**
 * Local-only consent lifecycle. This contract deliberately has no identity,
 * device, persistence, network, or connector fields. Core training must use
 * the same cognitive-only path whenever consent is not currently granted.
 */
export class WearableConsentState {
  private record: WearableConsentRecord;

  constructor(initial?: WearableConsentRecord, now = new Date()) {
    this.record = initial ? WearableConsentRecordSchema.parse(initial) : deniedRecord(now);
  }

  current(): WearableConsentRecord {
    return { ...this.record, categories: [...this.record.categories] };
  }

  grant(categories: WearableSignalCategory[], now = new Date()): WearableConsentRecord {
    this.record = WearableConsentRecordSchema.parse({
      contractVersion: WEARABLE_CONSENT_CONTRACT_VERSION,
      status: 'granted',
      categories,
      updatedAt: now.toISOString(),
    });
    return this.current();
  }

  deny(now = new Date()): WearableConsentRecord {
    this.record = { ...deniedRecord(now) };
    return this.current();
  }

  revoke(now = new Date()): WearableConsentRecord {
    this.record = {
      contractVersion: WEARABLE_CONSENT_CONTRACT_VERSION,
      status: 'revoked',
      categories: [],
      updatedAt: now.toISOString(),
    };
    return this.current();
  }

  requestPrivacyAction(action: WearablePrivacyRequest): WearablePrivacyRequest {
    return WearablePrivacyRequestSchema.parse(action);
  }

  hasConsentFor(category: WearableSignalCategory): boolean {
    return this.record.status === 'granted' && this.record.categories.includes(category);
  }
}
