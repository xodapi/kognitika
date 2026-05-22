import { z } from 'zod';

/**
 * Event Schemas (World Class Standards)
 * Using Zod for runtime validation and TypeScript for type safety.
 */

export const TrainingCompleteSchema = z.object({
  type: z.enum(['SCHULTE', 'TYPING', 'SPATIAL', 'STROOP', 'NBACK', 'LOGICAL_SEQUENCE', 'NUMERICAL_ANALYSIS', 'GUARD', 'REALITY']),
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

export const DifficultySuggestionSchema = z.object({
  nextGridSize: z.number(),
  noiseLevel: z.number(),
  rotationEnabled: z.boolean(),
  message: z.string()
});

// Registry of all events and their payloads
export const EventRegistry = {
  'TRAINING_COMPLETE': TrainingCompleteSchema,
  'CELL_CLICK': CellClickSchema,
  'MISTAKE_MADE': z.any(),
  'FEEDBACK_SUBMITTED': FeedbackSubmittedSchema,
  'DIFFICULTY_SUGGESTION': DifficultySuggestionSchema,
  'game:completed': z.any(), // Legacy/Bridge
  'feedback:submitted': FeedbackSubmittedSchema, // Legacy/Bridge alias
  'error': z.any(),
  'STABILITY_UPDATE': z.object({ avg: z.number(), stability: z.number() }),
  'GAME_START': z.any(),
  'GAME_END': z.any(),
  'SCORE_UPDATE': z.any(),
  'HIT': z.any(),
  'MISS': z.any()
};

export type EventMap = {
  [K in keyof typeof EventRegistry]: z.infer<typeof EventRegistry[K]>;
};
