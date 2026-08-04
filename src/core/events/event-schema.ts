import { z } from 'zod';

/**
 * Event Schemas (World Class Standards)
 * Using Zod for runtime validation and TypeScript for type safety.
 */

export const TrainingCompleteSchema = z.object({
  type: z.enum(['SCHULTE', 'TYPING', 'SPATIAL', 'STROOP', 'NBACK', 'LOGICAL_SEQUENCE', 'NUMERICAL_ANALYSIS', 'GUARD', 'REALITY', 'MENTAL_MATH', 'SCHULTE_90', 'ALPHABET_TABLE', 'STROOP_ALPHABET']),
  size: z.number().optional(),
  timeMs: z.number(),
  accuracy: z.number().optional(),
  score: z.number().optional(),
  level: z.number().optional(),
  errors: z.number().optional(),
  cpm: z.number().optional(), // for typing
  stabilityIndex: z.number().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export const CellClickSchema = z.object({
  num: z.number(),
  color: z.string().optional(),
  cellId: z.union([z.number(), z.string()]).optional(),
  gridIndex: z.number().optional(),
  x: z.number().optional(), // Normalized X (0-1)
  y: z.number().optional(), // Normalized Y (0-1)
  reactionTimeMs: z.number(),
  isCorrect: z.boolean()
});

export const FeedbackSubmittedSchema = z.object({
  userId: z.string(),
  trackingNum: z.string(),
  type: z.string(),
  content: z.string()
});

export const IdeaSubmittedSchema = z.object({
  userId: z.string(),
  ideaId: z.string(),
  title: z.string(),
  description: z.string()
});

export const DifficultySuggestionSchema = z.object({
  nextGridSize: z.number(),
  noiseLevel: z.number(),
  rotationEnabled: z.boolean(),
  message: z.string()
});

export const PracticeRecommendedSchema = z.object({
  category: z.enum(['cognitive', 'somatic', 'safety']),
  moduleId: z.string().min(1),
  reason: z.enum(['weak_area', 'streak_maintenance', 'variety', 'recovery']),
  sourceSessionId: z.string().min(1)
});

/** Server-only, post-persistence notification. It is not a durable work item. */
export const GameCompletedSchema = z.object({
  userId: z.string().min(1).max(120),
  sessionId: z.string().min(1).max(120),
  score: z.number().finite(),
  gameType: z.string().min(1).max(64),
  timeMs: z.number().finite().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const ErrorEventSchema = z.object({
  message: z.string().min(1).max(500),
}).passthrough();

export const GameStartSchema = z.object({
  type: z.string().min(1).max(64),
  level: z.number().int().nonnegative().optional(),
}).passthrough();

export const GameEndSchema = z.object({
  score: z.number().finite(),
  timeMs: z.number().finite().nonnegative(),
  accuracy: z.number().finite().optional(),
  vigilance: z.number().finite().optional(),
}).passthrough();

export const ScoreUpdateSchema = z.object({
  points: z.number().finite(),
}).passthrough();

// Registry of all events and their payloads
export const EventRegistry = {
  'TRAINING_COMPLETE': TrainingCompleteSchema,
  'CELL_CLICK': CellClickSchema,
  'MISTAKE_MADE': z.any(),
  'FEEDBACK_SUBMITTED': FeedbackSubmittedSchema,
  'IDEA_SUBMITTED': IdeaSubmittedSchema,
  'DIFFICULTY_SUGGESTION': DifficultySuggestionSchema,
  'PRACTICE_RECOMMENDED': PracticeRecommendedSchema,
  'game:completed': GameCompletedSchema,
  'feedback:submitted': FeedbackSubmittedSchema, // Legacy/Bridge alias
  'idea:submitted': IdeaSubmittedSchema, // Legacy/Bridge alias
  'error': ErrorEventSchema,
  'STABILITY_UPDATE': z.object({ avg: z.number(), stability: z.number() }),
  'GAME_START': GameStartSchema,
  'GAME_END': GameEndSchema,
  'SCORE_UPDATE': ScoreUpdateSchema,
  'HIT': z.any(),
  'MISS': z.any()
};

export type EventMap = {
  [K in keyof typeof EventRegistry]: z.infer<typeof EventRegistry[K]>;
};
