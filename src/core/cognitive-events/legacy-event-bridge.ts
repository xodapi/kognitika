import { z } from 'zod';
import {
  CognitiveInteractionEventSchema,
  type CognitiveInteractionEvent,
} from './contract.ts';

const MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1_000;
const SENSITIVE_FIELD_PATTERN = /(authorization|auth|bearer|brainid|cookie|email|jwt|localstorage|password|rawstorage|refresh|screenshot|secret|token|user)/i;

const LegacyCellClickSchema = z.object({
  num: z.number(),
  reactionTimeMs: z.number().finite(),
  isCorrect: z.boolean(),
}).passthrough();

const LegacyTrainingCompleteSchema = z.object({
  type: z.enum(['SCHULTE', 'NBACK', 'NUMERICAL_ANALYSIS']),
  timeMs: z.number().int().nonnegative().max(MAX_SESSION_DURATION_MS),
}).passthrough();

export const LegacyCognitiveEventNameSchema = z.enum([
  'CELL_CLICK',
  'MISTAKE_MADE',
  'TRAINING_COMPLETE',
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

function hasSensitiveKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasSensitiveKey);

  return Object.entries(value as Record<string, unknown>).some(([key, item]) => (
    SENSITIVE_FIELD_PATTERN.test(key) || hasSensitiveKey(item)
  ));
}

function completedAt(startedAt: string, tMs: number) {
  return new Date(Date.parse(startedAt) + tMs).toISOString();
}

/**
 * Additive translation layer for legacy EventBus payloads. It neither subscribes
 * to EventBus nor sends data, so individual engines can adopt it independently.
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
      !Number.isInteger(envelope.tMs)
      || envelope.tMs < this.lastTMs
      || envelope.tMs > MAX_SESSION_DURATION_MS
    ) return null;
    if (hasSensitiveKey(envelope.data)) return null;

    this.seenLegacyEventIds.add(envelope.legacyEventId);
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
        ...(parsed.data.reactionTimeMs > 0 && Number.isInteger(parsed.data.reactionTimeMs)
          ? { reactionTimeMs: parsed.data.reactionTimeMs }
          : {}),
      };
    }

    if (envelope.event === 'TRAINING_COMPLETE') {
      const parsed = LegacyTrainingCompleteSchema.safeParse(envelope.data);
      if (!parsed.success || !this.matchesModule(parsed.data.type)) return null;

      event = {
        ...base,
        kind: 'session_completed',
        completedAt: completedAt(this.context.startedAt, envelope.tMs),
      };
      this.terminal = true;
    }

    if (!event || !CognitiveInteractionEventSchema.safeParse(event).success) return null;
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
