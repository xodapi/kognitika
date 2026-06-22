import { z } from 'zod';
import {
  AnalyzeSessionCategorySchema,
  AnalyzeSessionInputSchema,
  RecommendationSignalSchema,
  analyzeSession,
  parseAnalyzeSessionInput,
  type AnalyzeSessionInput,
} from './session-analysis';

const jobIdSchema = z.string().min(1).max(120).regex(/^analytics-job-[A-Za-z0-9._:-]+$/);
const analyzerVersionSchema = z.literal('analyze-session-v1');

export const SessionAnalyticsJobSchema = z.object({
  schemaVersion: z.literal(1),
  jobId: jobIdSchema,
  analyzerVersion: analyzerVersionSchema,
  receivedAt: z.string().datetime(),
  session: AnalyzeSessionInputSchema,
}).strict();

export const SessionAnalyticsSummaryRecordSchema = z.object({
  schemaVersion: z.literal(1),
  analyzerVersion: analyzerVersionSchema,
  jobId: jobIdSchema,
  sourceSessionId: z.string().min(1).max(120),
  moduleId: z.string().min(1).max(64),
  category: AnalyzeSessionCategorySchema,
  completed: z.boolean(),
  createdAt: z.string().datetime(),
  eventCount: z.number().int().nonnegative().max(10_000),
  clickCount: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  p50ReactionMs: z.number().int().nonnegative(),
  p95ReactionMs: z.number().int().nonnegative(),
  speedSlope: z.number(),
  accuracy: z.number().min(0).max(1),
  fatigueIndex: z.number().min(-1).max(1),
  engagementIndex: z.number().min(0).max(1),
  suspiciousPatternScore: z.number().min(0).max(1),
  recommendationSignals: z.array(RecommendationSignalSchema),
}).strict();

export type SessionAnalyticsJob = z.infer<typeof SessionAnalyticsJobSchema>;
export type SessionAnalyticsSummaryRecord = z.infer<typeof SessionAnalyticsSummaryRecordSchema>;

const SENSITIVE_FIELD_PATTERN = /(authorization|auth|bearer|brainid|cookie|email|jwt|localstorage|password|rawstorage|refresh|screenshot|secret|token|user)/i;

function hasSensitiveKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasSensitiveKey);

  return Object.entries(value as Record<string, unknown>).some(([key, item]) => (
    SENSITIVE_FIELD_PATTERN.test(key) || hasSensitiveKey(item)
  ));
}

export function parseSessionAnalyticsJob(value: unknown) {
  if (hasSensitiveKey(value)) {
    return {
      success: false as const,
      error: 'Session analytics jobs must not contain identity, token, raw storage, or screenshot fields',
    };
  }

  const parsed = SessionAnalyticsJobSchema.safeParse(value);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.format() };
  }

  const sessionParsed = parseAnalyzeSessionInput(parsed.data.session);
  if (!sessionParsed.success) {
    return { success: false as const, error: sessionParsed.error };
  }

  return { success: true as const, data: parsed.data };
}

export function createSessionAnalyticsSummary(
  job: SessionAnalyticsJob,
  now = new Date(),
): SessionAnalyticsSummaryRecord {
  const parsed = parseSessionAnalyticsJob(job);
  if (!parsed.success) {
    throw new Error('Invalid session analytics job');
  }

  const session: AnalyzeSessionInput = parsed.data.session;
  const analysis = analyzeSession(session);

  return {
    schemaVersion: 1,
    analyzerVersion: parsed.data.analyzerVersion,
    jobId: parsed.data.jobId,
    sourceSessionId: session.sessionId,
    moduleId: session.moduleId,
    category: session.category,
    completed: Boolean(session.completedAt),
    createdAt: now.toISOString(),
    eventCount: session.events.length,
    clickCount: analysis.clickCount,
    durationMs: analysis.durationMs,
    p50ReactionMs: analysis.p50ReactionMs,
    p95ReactionMs: analysis.p95ReactionMs,
    speedSlope: analysis.speedSlope,
    accuracy: analysis.accuracy,
    fatigueIndex: analysis.fatigueIndex,
    engagementIndex: analysis.engagementIndex,
    suspiciousPatternScore: analysis.suspiciousPatternScore,
    recommendationSignals: analysis.recommendationSignals,
  };
}
