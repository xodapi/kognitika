import { z } from 'zod';

export const gameTypeSchema = z.enum([
  'SCHULTE',
  'SCHULTE_GORBOV',
  'NUMERICAL_ANALYSIS',
  'LOGICAL_SEQUENCE',
  'SITUATIONAL_JUDGMENT',
  'STROOP',
  'N_BACK',
  'OBJECTIVE_FILTER',
  'PROFILING_RICE',
  'ANOMALY_DETECTOR',
  'DIALOGUE_2_1',
  'SPEED_TYPING',
  'SPATIAL_CONCEALMENT',
  'TOPOLOGY_MEMORY',
  'COLLISION_DETECTOR',
  'ASYNC_DISPATCHER',
  'NOISE_REDUCTION',
  'LANGUAGE_SCANNER',
  'DECRYPTOR',
  'REALITY_CHECK',
  'MENTAL_MATH',
  'SCHULTE_90',
  'ALPHABET_TABLE',
  'STROOP_ALPHABET',
]);

export const startGameAttemptSchema = z.object({
  gameType: gameTypeSchema,
  clientRunId: z.string().uuid(),
}).strict();

export const saveGameSchema = z.object({
  clientRunId: z.string().uuid().optional(),
  attemptId: z.string().min(1).optional(),
  challenge: z.string().min(1).max(512).optional(),
  gameType: gameTypeSchema,
  timeMs: z.number().int().min(100).optional(),
  isCompleted: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  analyticsJob: z.unknown().optional()
}).strict();

export const updateMetadataSchema = z.object({
  metadata: z.record(z.string(), z.unknown())
}).strict();
