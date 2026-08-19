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

const LegacyTrainingCompleteSchema = z.object({
  type: z.enum(['SCHULTE', 'NBACK', 'NUMERICAL_ANALYSIS']),
  timeMs: z.number().int().nonnegative().max(MAX_SESSION_DURATION_MS),
  size: z.number().finite().optional(),
  accuracy: z.number().finite().optional(),
  score: z.number().finite().optional(),
  level: z.number().finite().optional(),
  errors: z.number().finite().optional(),
}).strict();

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
  moduleId: 'schulte' | 'numerical' | 'nback';
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
      const parsed = LegacyCellClickSchema.safeParse(envelope.data);
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
      const parsed = LegacyTrainingCompleteSchema.safeParse(envelope.data);
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

  private matchesModule(type: z.infer<typeof LegacyTrainingCompleteSchema>['type']) {
    return (
      (this.context.moduleId === 'schulte' && type === 'SCHULTE')
      || (this.context.moduleId === 'nback' && type === 'NBACK')
      || (this.context.moduleId === 'numerical' && type === 'NUMERICAL_ANALYSIS')
    );
  }
}
