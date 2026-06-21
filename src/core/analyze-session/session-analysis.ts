import { z } from 'zod';

export const AnalyzeSessionCategorySchema = z.enum(['cognitive', 'somatic', 'safety']);
export const AnalyzeSessionEventKindSchema = z.enum(['click', 'answer', 'mistake', 'checkpoint']);
export const RecommendationSignalSchema = z.enum(['weak_area', 'streak_maintenance', 'variety', 'recovery']);

const moduleIdSchema = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);
const checkpointSchema = z.string().min(1).max(80).regex(/^[a-z0-9:_-]+$/);
const sessionIdSchema = z.string().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/);

export const AnalyzeSessionEventSchema = z.object({
  tMs: z.number().int().nonnegative().max(24 * 60 * 60 * 1000),
  kind: AnalyzeSessionEventKindSchema,
  reactionTimeMs: z.number().int().positive().max(60_000).optional(),
  isCorrect: z.boolean().optional(),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  checkpoint: checkpointSchema.optional(),
}).strict();

export const AnalyzeSessionInputSchema = z.object({
  schemaVersion: z.literal(1),
  sessionId: sessionIdSchema,
  moduleId: moduleIdSchema,
  category: AnalyzeSessionCategorySchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  events: z.array(AnalyzeSessionEventSchema).max(10_000),
}).strict();

export const AnalyzeSessionOutputSchema = z.object({
  schemaVersion: z.literal(1),
  durationMs: z.number().int().nonnegative(),
  clickCount: z.number().int().nonnegative(),
  p50ReactionMs: z.number().int().nonnegative(),
  p95ReactionMs: z.number().int().nonnegative(),
  speedSlope: z.number(),
  accuracy: z.number().min(0).max(1),
  fatigueIndex: z.number().min(-1).max(1),
  engagementIndex: z.number().min(0).max(1),
  suspiciousPatternScore: z.number().min(0).max(1),
  recommendationSignals: z.array(RecommendationSignalSchema),
}).strict();

export type AnalyzeSessionCategory = z.infer<typeof AnalyzeSessionCategorySchema>;
export type AnalyzeSessionEvent = z.infer<typeof AnalyzeSessionEventSchema>;
export type AnalyzeSessionInput = z.infer<typeof AnalyzeSessionInputSchema>;
export type AnalyzeSessionOutput = z.infer<typeof AnalyzeSessionOutputSchema>;
export type RecommendationSignal = z.infer<typeof RecommendationSignalSchema>;

const SENSITIVE_FIELD_PATTERN = /(authorization|auth|bearer|brainid|cookie|email|jwt|localstorage|password|rawstorage|refresh|screenshot|secret|token|user)/i;

function hasSensitiveKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasSensitiveKey);

  return Object.entries(value as Record<string, unknown>).some(([key, item]) => (
    SENSITIVE_FIELD_PATTERN.test(key) || hasSensitiveKey(item)
  ));
}

export function parseAnalyzeSessionInput(value: unknown) {
  if (hasSensitiveKey(value)) {
    return {
      success: false as const,
      error: 'AnalyzeSession input must not contain identity, token, raw storage, or screenshot fields',
    };
  }

  const parsed = AnalyzeSessionInputSchema.safeParse(value);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.format() };
  }

  return { success: true as const, data: parsed.data };
}

function round(value: number, digits = 3) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function percentileNearestRank(values: readonly number[], percentile: number) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp(Math.ceil((percentile / 100) * sorted.length) - 1, 0, sorted.length - 1);
  return sorted[index];
}

function median(values: readonly number[]) {
  return percentileNearestRank(values, 50);
}

function calculateDurationMs(input: AnalyzeSessionInput) {
  const started = Date.parse(input.startedAt);
  const completed = input.completedAt ? Date.parse(input.completedAt) : NaN;
  if (Number.isFinite(started) && Number.isFinite(completed) && completed >= started) {
    return completed - started;
  }

  return Math.max(0, ...input.events.map((event) => event.tMs));
}

function calculateSpeedSlope(events: readonly AnalyzeSessionEvent[]) {
  const samples = events
    .filter((event) => typeof event.reactionTimeMs === 'number')
    .map((event) => ({ x: event.tMs / 1000, y: event.reactionTimeMs as number }));

  if (samples.length < 2) return 0;

  const xMean = samples.reduce((sum, sample) => sum + sample.x, 0) / samples.length;
  const yMean = samples.reduce((sum, sample) => sum + sample.y, 0) / samples.length;
  const denominator = samples.reduce((sum, sample) => sum + ((sample.x - xMean) ** 2), 0);
  if (denominator === 0) return 0;

  const numerator = samples.reduce(
    (sum, sample) => sum + ((sample.x - xMean) * (sample.y - yMean)),
    0,
  );

  return round(numerator / denominator, 4);
}

function calculateFatigueIndex(events: readonly AnalyzeSessionEvent[]) {
  const samples = events
    .filter((event) => typeof event.reactionTimeMs === 'number')
    .map((event) => event.reactionTimeMs as number);

  if (samples.length < 4) return 0;

  const split = Math.ceil(samples.length / 2);
  const earlyMedian = median(samples.slice(0, split));
  const lateMedian = median(samples.slice(split));
  if (earlyMedian <= 0) return 0;

  return round(clamp((lateMedian - earlyMedian) / earlyMedian, -1, 1), 3);
}

function calculateEngagementIndex(input: AnalyzeSessionInput, durationMs: number, clickCount: number) {
  const checkpointCount = input.events.filter((event) => event.kind === 'checkpoint').length;
  const completedBonus = input.completedAt ? 0.4 : 0;
  const interactionScore = Math.min(clickCount / 8, 1) * 0.3;
  const checkpointScore = Math.min(checkpointCount / 2, 1) * 0.2;
  const durationScore = Math.min(durationMs / 30_000, 1) * 0.1;

  return round(clamp(completedBonus + interactionScore + checkpointScore + durationScore, 0, 1), 3);
}

function standardDeviation(values: readonly number[]) {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculateSuspiciousPatternScore(reactionTimes: readonly number[], accuracy: number) {
  if (reactionTimes.length === 0) return 0;

  const impossiblyFastRatio = reactionTimes.filter((value) => value < 80).length / reactionTimes.length;
  const uniformPatternScore = reactionTimes.length >= 4 && standardDeviation(reactionTimes) < 4 ? 0.25 : 0;
  const perfectFastScore = accuracy >= 0.95 && percentileNearestRank(reactionTimes, 50) < 120 ? 0.15 : 0;

  return round(clamp((impossiblyFastRatio * 0.6) + uniformPatternScore + perfectFastScore, 0, 1), 3);
}

function inferRecommendationSignals(accuracy: number, fatigueIndex: number, engagementIndex: number): RecommendationSignal[] {
  const signals = new Set<RecommendationSignal>();

  if (accuracy < 0.75) signals.add('weak_area');
  if (fatigueIndex >= 0.2 || engagementIndex < 0.35) signals.add('recovery');
  if (accuracy >= 0.9 && fatigueIndex <= 0.1) signals.add('streak_maintenance');
  if (signals.size === 0) signals.add('variety');

  return Array.from(signals);
}

export function analyzeSession(input: AnalyzeSessionInput): AnalyzeSessionOutput {
  const parsed = parseAnalyzeSessionInput(input);
  if (!parsed.success) {
    throw new Error('Invalid AnalyzeSession input');
  }

  const safeInput = parsed.data;
  const reactionTimes = safeInput.events
    .filter((event) => typeof event.reactionTimeMs === 'number')
    .map((event) => event.reactionTimeMs as number);
  const correctnessEvents = safeInput.events.filter((event) => typeof event.isCorrect === 'boolean');
  const correctCount = correctnessEvents.filter((event) => event.isCorrect).length;
  const accuracy = correctnessEvents.length > 0 ? correctCount / correctnessEvents.length : 0;
  const durationMs = calculateDurationMs(safeInput);
  const clickCount = safeInput.events.filter((event) => event.kind === 'click').length;
  const fatigueIndex = calculateFatigueIndex(safeInput.events);
  const engagementIndex = calculateEngagementIndex(safeInput, durationMs, clickCount);

  return {
    schemaVersion: 1,
    durationMs,
    clickCount,
    p50ReactionMs: percentileNearestRank(reactionTimes, 50),
    p95ReactionMs: percentileNearestRank(reactionTimes, 95),
    speedSlope: calculateSpeedSlope(safeInput.events),
    accuracy: round(accuracy, 3),
    fatigueIndex,
    engagementIndex,
    suspiciousPatternScore: calculateSuspiciousPatternScore(reactionTimes, accuracy),
    recommendationSignals: inferRecommendationSignals(accuracy, fatigueIndex, engagementIndex),
  };
}
