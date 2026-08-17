import {
  MAX_COMPLETED_SESSION_ANALYTICS_JOB_BYTES,
  CompletedSessionAnalyticsJobSchema,
  type CognitiveInteractionEvent,
  type CompletedSessionAnalyticsJob,
} from './contract.ts';

const MAX_EVENTS = 10_000;
const MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1_000;
const SENSITIVE_FIELD_PATTERN = /(authorization|auth|bearer|brainid|cookie|email|jwt|localstorage|password|rawstorage|refresh|screenshot|secret|token|user)/i;

type Category = 'cognitive' | 'somatic' | 'safety';

type WithoutEventIdentity<T> = T extends unknown
  ? Omit<T, 'schemaVersion' | 'eventId' | 'sessionId' | 'moduleId' | 'moduleVersion' | 'category' | 'sequence'>
  : never;
type RecordableEvent = WithoutEventIdentity<CognitiveInteractionEvent>;

export interface CognitiveSessionCollectorOptions {
  sessionId: string;
  moduleId: string;
  moduleVersion: string;
  category: Category;
  startedAt: string;
  analyzerVersion?: 'analyze-session-v1';
}

export type CognitiveSessionAbandonment = Extract<CognitiveInteractionEvent, { kind: 'session_abandoned' }>;

function hasSensitiveKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasSensitiveKey);

  return Object.entries(value as Record<string, unknown>).some(([key, item]) => (
    SENSITIVE_FIELD_PATTERN.test(key) || hasSensitiveKey(item)
  ));
}

function byteLength(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

/** A local, transport-free collector. It does not own identity, persistence, or delivery. */
export class CognitiveSessionEventCollector {
  private readonly events: CognitiveInteractionEvent[] = [];
  private terminal: CognitiveInteractionEvent | null = null;
  private lastTMs = 0;

  constructor(private readonly options: CognitiveSessionCollectorOptions) {}

  record(event: RecordableEvent): CognitiveInteractionEvent {
    if (this.terminal) throw new Error('Cannot record events after session termination');
    if (hasSensitiveKey(event)) throw new Error('Cognitive events must not contain sensitive material');
    if (!Number.isInteger(event.tMs) || event.tMs < this.lastTMs || event.tMs > MAX_SESSION_DURATION_MS) {
      throw new Error('Event time must be monotonic and within 24 hours');
    }
    if (this.events.length >= MAX_EVENTS) throw new Error('Cognitive session event limit exceeded');

    const canonical = {
      ...event,
      schemaVersion: 1 as const,
      eventId: `${this.options.sessionId}:${this.events.length}`,
      sessionId: this.options.sessionId,
      moduleId: this.options.moduleId,
      moduleVersion: this.options.moduleVersion,
      category: this.options.category,
      sequence: this.events.length,
    } as CognitiveInteractionEvent;

    if (byteLength([...this.events, canonical]) > MAX_COMPLETED_SESSION_ANALYTICS_JOB_BYTES) {
      throw new Error('Cognitive session serialized byte limit exceeded');
    }

    if (canonical.kind === 'session_completed' || canonical.kind === 'session_abandoned') {
      this.terminal = canonical;
    }
    this.events.push(canonical);
    this.lastTMs = canonical.tMs;

    return canonical;
  }

  complete(tMs: number, completedAt: string) {
    return this.record({ kind: 'session_completed', tMs, completedAt });
  }

  abandon(tMs: number, reason: Extract<CognitiveSessionAbandonment, { kind: 'session_abandoned' }>['reason'], lastCheckpoint?: string) {
    return this.record({
      kind: 'session_abandoned',
      tMs,
      reason,
      ...(lastCheckpoint ? { lastCheckpoint } : {}),
    }) as CognitiveSessionAbandonment;
  }

  createCompletedJob(receivedAt: string): CompletedSessionAnalyticsJob {
    if (this.terminal?.kind !== 'session_completed') {
      throw new Error('Only a completed session can create a CompletedSessionAnalyticsJob');
    }

    const job = {
      schemaVersion: 1 as const,
      jobId: `analytics-job-${this.options.sessionId}`,
      analyzerVersion: this.options.analyzerVersion || 'analyze-session-v1',
      receivedAt,
      sessionId: this.options.sessionId,
      moduleId: this.options.moduleId,
      moduleVersion: this.options.moduleVersion,
      category: this.options.category,
      startedAt: this.options.startedAt,
      completedAt: this.terminal.completedAt,
      events: [...this.events],
    };
    const parsed = CompletedSessionAnalyticsJobSchema.safeParse(job);
    if (!parsed.success) throw new Error('Collected completed session is invalid');
    return parsed.data;
  }

  get eventCount() {
    return this.events.length;
  }
}
