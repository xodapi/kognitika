import {
  SessionAnalyticsSummaryRecordSchema,
  type SessionAnalyticsSummaryRecord,
} from '../../core/analyze-session/index.ts';

const SENSITIVE_FIELD_PATTERN = /(authorization|auth|bearer|brainid|cookie|email|jwt|localstorage|password|rawstorage|refresh|screenshot|secret|token|user)/i;

export function assertSafeAnalyticsSummary(record: SessionAnalyticsSummaryRecord): void {
  if (SENSITIVE_FIELD_PATTERN.test(JSON.stringify(record))) {
    throw new Error('Summary record contains sensitive material');
  }

  const validation = SessionAnalyticsSummaryRecordSchema.safeParse(record);
  if (!validation.success) {
    throw new Error('Invalid SessionAnalyticsSummaryRecord');
  }
}
