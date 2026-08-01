import type { AnalyzeSessionInput } from '../analyze-session/session-analysis.ts';
import { parseAnalyzeSessionInput } from '../analyze-session/session-analysis.ts';
import { CompletedSessionAnalyticsJobSchema } from './contract.ts';

const SENSITIVE_FIELD_PATTERN = /(authorization|auth|bearer|brainid|cookie|email|jwt|localstorage|password|rawstorage|refresh|screenshot|secret|token|user)/i;

function hasSensitiveKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasSensitiveKey);

  return Object.entries(value as Record<string, unknown>).some(([key, item]) => (
    SENSITIVE_FIELD_PATTERN.test(key) || hasSensitiveKey(item)
  ));
}

export function parseCompletedSessionAnalyticsJob(value: unknown) {
  if (hasSensitiveKey(value)) {
    return {
      success: false as const,
      error: 'Cognitive analytics jobs must not contain identity, token, raw storage, or screenshot fields',
    };
  }

  const parsed = CompletedSessionAnalyticsJobSchema.safeParse(value);
  if (!parsed.success) return { success: false as const, error: parsed.error.format() };

  return { success: true as const, data: parsed.data };
}

export function completedSessionJobToAnalyzeSessionInput(
  job: unknown,
): AnalyzeSessionInput {
  const parsed = parseCompletedSessionAnalyticsJob(job);
  if (!parsed.success) throw new Error('Invalid completed session analytics job');

  const session = {
    schemaVersion: 1 as const,
    sessionId: parsed.data.sessionId,
    moduleId: parsed.data.moduleId,
    category: parsed.data.category,
    startedAt: parsed.data.startedAt,
    completedAt: parsed.data.completedAt,
    events: parsed.data.events
      .filter((event) => event.kind === 'trial_answered' || event.kind === 'checkpoint')
      .map((event) => {
        if (event.kind === 'checkpoint') {
          return { tMs: event.tMs, kind: 'checkpoint' as const, checkpoint: event.checkpoint };
        }

        return {
          tMs: event.tMs,
          kind: 'click' as const,
          isCorrect: event.isCorrect,
          ...(event.reactionTimeMs === undefined ? {} : { reactionTimeMs: event.reactionTimeMs }),
        };
      }),
  };

  const analysisInput = parseAnalyzeSessionInput(session);
  if (!analysisInput.success) throw new Error('Canonical cognitive job cannot be converted to AnalyzeSessionInput');

  return analysisInput.data;
}
