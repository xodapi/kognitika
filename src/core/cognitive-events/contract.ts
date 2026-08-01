import { z } from 'zod';

const MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1_000;
const sessionIdSchema = z.string().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/);
const moduleIdSchema = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);
const moduleVersionSchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9._:-]+$/);
const eventIdSchema = z.string().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/);
const difficultySchema = z.string().min(1).max(64).regex(/^[A-Za-z0-9._:-]+$/);
const checkpointSchema = z.string().min(1).max(80).regex(/^[a-z0-9:_-]+$/);

export const CognitiveEventCategorySchema = z.enum(['cognitive', 'somatic', 'safety']);
export const CognitiveInteractionKindSchema = z.enum([
  'trial_started',
  'trial_answered',
  'checkpoint',
  'session_completed',
  'session_abandoned',
]);

const eventBase = {
  schemaVersion: z.literal(1),
  eventId: eventIdSchema,
  sessionId: sessionIdSchema,
  moduleId: moduleIdSchema,
  moduleVersion: moduleVersionSchema,
  category: CognitiveEventCategorySchema,
  sequence: z.number().int().nonnegative().max(10_000),
  tMs: z.number().int().nonnegative().max(MAX_SESSION_DURATION_MS),
};

export const TrialStartedCognitiveEventSchema = z.object({
  ...eventBase,
  kind: z.literal('trial_started'),
  trialType: z.string().min(1).max(64).regex(/^[a-z0-9:_-]+$/),
  difficulty: difficultySchema.optional(),
}).strict();

export const TrialAnsweredCognitiveEventSchema = z.object({
  ...eventBase,
  kind: z.literal('trial_answered'),
  trialType: z.string().min(1).max(64).regex(/^[a-z0-9:_-]+$/),
  isCorrect: z.boolean(),
  reactionTimeMs: z.number().int().positive().max(60_000).optional(),
  difficulty: difficultySchema.optional(),
}).strict();

export const CheckpointCognitiveEventSchema = z.object({
  ...eventBase,
  kind: z.literal('checkpoint'),
  checkpoint: checkpointSchema,
}).strict();

export const SessionCompletedCognitiveEventSchema = z.object({
  ...eventBase,
  kind: z.literal('session_completed'),
  completedAt: z.string().datetime(),
}).strict();

export const SessionAbandonedCognitiveEventSchema = z.object({
  ...eventBase,
  kind: z.literal('session_abandoned'),
  reason: z.enum(['route_change', 'pagehide', 'inactive', 'user_exit', 'timeout']),
  lastCheckpoint: checkpointSchema.optional(),
}).strict();

export const CognitiveInteractionEventSchema = z.discriminatedUnion('kind', [
  TrialStartedCognitiveEventSchema,
  TrialAnsweredCognitiveEventSchema,
  CheckpointCognitiveEventSchema,
  SessionCompletedCognitiveEventSchema,
  SessionAbandonedCognitiveEventSchema,
]);

export const CompletedSessionAnalyticsJobSchema = z.object({
  schemaVersion: z.literal(1),
  jobId: z.string().min(1).max(120).regex(/^analytics-job-[A-Za-z0-9._:-]+$/),
  analyzerVersion: z.literal('analyze-session-v1'),
  receivedAt: z.string().datetime(),
  sessionId: sessionIdSchema,
  moduleId: moduleIdSchema,
  moduleVersion: moduleVersionSchema,
  category: CognitiveEventCategorySchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  events: z.array(CognitiveInteractionEventSchema).min(1).max(10_000),
}).strict().superRefine((job, context) => {
  const first = job.events[0];
  if (job.events.some((event) => (
    event.sessionId !== job.sessionId
    || event.moduleId !== job.moduleId
    || event.moduleVersion !== job.moduleVersion
    || event.category !== job.category
  ))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['events'],
      message: 'every event must match the job session, module, version, and category',
    });
  }

  if (first?.sequence !== 0 || job.events.some((event, index) => event.sequence !== index)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['events'],
      message: 'event sequences must start at zero and be contiguous',
    });
  }

  if (job.events.some((event, index) => index > 0 && event.tMs < job.events[index - 1].tMs)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['events'],
      message: 'event tMs values must be monotonic',
    });
  }

  const durationMs = Date.parse(job.completedAt) - Date.parse(job.startedAt);
  if (durationMs < 0 || durationMs > MAX_SESSION_DURATION_MS) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['completedAt'],
      message: 'completedAt must be between startedAt and 24 hours after startedAt',
    });
  }

  const terminalEvents = job.events.filter((event) => (
    event.kind === 'session_completed' || event.kind === 'session_abandoned'
  ));
  const terminalEvent = terminalEvents[0];
  if (terminalEvents.length !== 1 || terminalEvent?.kind !== 'session_completed') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['events'],
      message: 'a completed analytics job requires exactly one session_completed terminal event',
    });
  } else if (terminalEvent.completedAt !== job.completedAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['events'],
      message: 'the session_completed timestamp must match completedAt',
    });
  }
});

export type CognitiveInteractionEvent = z.infer<typeof CognitiveInteractionEventSchema>;
export type CompletedSessionAnalyticsJob = z.infer<typeof CompletedSessionAnalyticsJobSchema>;
