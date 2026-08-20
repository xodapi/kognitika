import { z } from 'zod';
import {
  CognitiveInteractionEventSchema,
  type CognitiveInteractionEvent,
} from './contract.ts';

const MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1_000;
const LEGACY_EVENT_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;
const LegacyCellClickSchema = z.object({
  num: z.number().finite(),
  reactionTimeMs: z.number().finite().optional(),
  isCorrect: z.boolean(),
  // These legacy EventBus fields are numeric UI references only. They are
  // deliberately not copied into the canonical event.
  cellId: z.number().finite().optional(),
  gridIndex: z.number().finite().optional(),
  x: z.number().finite().min(0).max(1).optional(),
  y: z.number().finite().min(0).max(1).optional(),
}).strict();

const LegacySchulte90CellClickSchema = LegacyCellClickSchema.extend({
  // Schulte 90 emits the displayed cell color; it is intentionally discarded.
  color: z.enum(['black', 'red']),
}).strict();

const LegacyTrainingCompleteSchema = z.object({
  type: z.enum(['SCHULTE', 'NBACK', 'NUMERICAL_ANALYSIS', 'LOGICAL_SEQUENCE']),
  timeMs: z.number().int().nonnegative().max(MAX_SESSION_DURATION_MS),
  size: z.number().finite().optional(),
  accuracy: z.number().finite().optional(),
  score: z.number().finite().optional(),
  level: z.number().finite().optional(),
  errors: z.number().finite().optional(),
}).strict();

const LegacyStroopTrainingCompleteSchema = z.object({
  type: z.literal('STROOP'),
  timeMs: z.number().int().nonnegative().max(MAX_SESSION_DURATION_MS),
  score: z.number().finite(),
  errors: z.number().finite(),
  level: z.number().finite(),
  metadata: z.object({
    avgReactionTime: z.number().finite(),
  }).strict(),
}).strict();

const LegacySchulte90TrainingCompleteSchema = z.object({
  type: z.literal('SCHULTE_90'),
  timeMs: z.number().int().nonnegative().max(MAX_SESSION_DURATION_MS),
  accuracy: z.number().finite().min(0).max(100),
  score: z.number().int().min(10).max(1_000),
  errors: z.number().int().nonnegative(),
  metadata: z.object({
    rule: z.enum(['classic', 'black-red', 'red-black', 'black-pairs', 'red-pairs']),
    rows: z.literal(9),
    cols: z.literal(10),
    size: z.literal(10),
    totalQuestions: z.literal(90),
  }).strict(),
}).strict();

const LegacyMentalMathTrainingCompleteSchema = z.object({
  type: z.literal('MENTAL_MATH'),
  timeMs: z.number().int().nonnegative().max(MAX_SESSION_DURATION_MS),
  level: z.number().int().min(1).max(4),
  accuracy: z.number().finite().min(0).max(100),
  errors: z.number().int().nonnegative(),
  score: z.number().finite(),
  metadata: z.object({
    correctAnswers: z.number().int().nonnegative(),
    totalQuestions: z.number().int().min(1).max(48),
  }).strict(),
}).strict();

const LegacyAnyTrainingCompleteSchema = z.union([
  LegacyTrainingCompleteSchema,
  LegacyStroopTrainingCompleteSchema,
  LegacySchulte90TrainingCompleteSchema,
  LegacyMentalMathTrainingCompleteSchema,
]);

const LegacyTrainingAbandonedSchema = z.object({
  reason: z.enum(['route_change', 'pagehide', 'inactive', 'user_exit', 'timeout']),
  lastCheckpoint: z.string().min(1).max(80).regex(/^[a-z0-9:_-]+$/).optional(),
}).strict();

export const LegacyCognitiveEventNameSchema = z.enum([
  'CELL_CLICK',
  'TRAINING_COMPLETE',
  /**
   * This is adapter-only input, not an EventBus public event. There is no
   * legacy abandonment EventBus event today, so callers must opt into this
   * narrow shape rather than forwarding arbitrary lifecycle data.
   */
  'TRAINING_ABANDONED',
]);

export interface LegacyCognitiveEventBridgeContext {
  sessionId: string;
  moduleId: 'schulte' | 'schulte-90' | 'numerical' | 'nback' | 'logical' | 'stroop' | 'mental-math';
  moduleVersion: string;
  startedAt: string;
}

export interface LegacyCognitiveEventEnvelope {
  legacyEventId: string;
  event: z.infer<typeof LegacyCognitiveEventNameSchema>;
  data: unknown;
  tMs: number;
}

function completedAt(startedAt: string, tMs: number): string | null {
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) return null;
  return new Date(startedAtMs + tMs).toISOString();
}

/**
 * Additive translation layer for legacy EventBus payloads. It neither subscribes
 * to EventBus nor sends data, so individual engines can adopt it independently.
 * Accepted events use increasing sequence numbers and nondecreasing tMs; invalid
 * envelopes do not advance either counter.
 */
export class LegacyCognitiveEventBridge {
  private sequence = 0;
  private lastTMs = 0;
  private terminal = false;
  private readonly seenLegacyEventIds = new Set<string>();

  constructor(private readonly context: LegacyCognitiveEventBridgeContext) {}

  translate(envelope: LegacyCognitiveEventEnvelope): CognitiveInteractionEvent | null {
    if (this.terminal || this.seenLegacyEventIds.has(envelope.legacyEventId)) return null;
    if (
      !LEGACY_EVENT_ID_PATTERN.test(envelope.legacyEventId)
      || envelope.legacyEventId.length > 100
      || !Number.isInteger(envelope.tMs)
      || envelope.tMs < this.lastTMs
      || envelope.tMs > MAX_SESSION_DURATION_MS
    ) return null;

    const base = {
      schemaVersion: 1 as const,
      eventId: `legacy-${envelope.legacyEventId}`,
      sessionId: this.context.sessionId,
      moduleId: this.context.moduleId,
      moduleVersion: this.context.moduleVersion,
      category: 'cognitive' as const,
      sequence: this.sequence,
      tMs: envelope.tMs,
    };

    let event: CognitiveInteractionEvent | null = null;
    if (envelope.event === 'CELL_CLICK') {
      if (this.context.moduleId === 'mental-math') return null;
      const parsed = (this.context.moduleId === 'schulte-90'
        ? LegacySchulte90CellClickSchema
        : LegacyCellClickSchema).safeParse(envelope.data);
      if (!parsed.success) return null;

      event = {
        ...base,
        kind: 'trial_answered',
        trialType: `${this.context.moduleId}:trial`,
        isCorrect: parsed.data.isCorrect,
        ...(parsed.data.reactionTimeMs !== undefined
          && parsed.data.reactionTimeMs > 0
          && Number.isInteger(parsed.data.reactionTimeMs)
          ? { reactionTimeMs: parsed.data.reactionTimeMs }
          : {}),
      };
    }

    if (envelope.event === 'TRAINING_ABANDONED') {
      const parsed = LegacyTrainingAbandonedSchema.safeParse(envelope.data);
      if (!parsed.success) return null;

      event = {
        ...base,
        kind: 'session_abandoned',
        reason: parsed.data.reason,
        ...(parsed.data.lastCheckpoint ? { lastCheckpoint: parsed.data.lastCheckpoint } : {}),
      };
    }

    if (envelope.event === 'TRAINING_COMPLETE') {
      const parsed = LegacyAnyTrainingCompleteSchema.safeParse(envelope.data);
      if (!parsed.success || !this.matchesModule(parsed.data.type)) return null;
      if (parsed.data.timeMs !== envelope.tMs) return null;
      const terminalCompletedAt = completedAt(this.context.startedAt, envelope.tMs);
      if (!terminalCompletedAt) return null;

      event = {
        ...base,
        kind: 'session_completed',
        completedAt: terminalCompletedAt,
      };
    }

    if (!event || !CognitiveInteractionEventSchema.safeParse(event).success) return null;
    if (event.kind === 'session_completed' || event.kind === 'session_abandoned') this.terminal = true;
    this.seenLegacyEventIds.add(envelope.legacyEventId);
    this.sequence += 1;
    this.lastTMs = envelope.tMs;
    return event;
  }

  private matchesModule(type: z.infer<typeof LegacyAnyTrainingCompleteSchema>['type']) {
    return (
      (this.context.moduleId === 'schulte' && type === 'SCHULTE')
      || (this.context.moduleId === 'schulte-90' && type === 'SCHULTE_90')
      || (this.context.moduleId === 'nback' && type === 'NBACK')
      || (this.context.moduleId === 'numerical' && type === 'NUMERICAL_ANALYSIS')
      || (this.context.moduleId === 'logical' && type === 'LOGICAL_SEQUENCE')
      || (this.context.moduleId === 'stroop' && type === 'STROOP')
      || (this.context.moduleId === 'mental-math' && type === 'MENTAL_MATH')
    );
  }
}
