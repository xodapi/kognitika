import { z } from 'zod';

export const saveGameSchema = z.object({
  clientRunId: z.string().uuid().optional(),
  gameType: z.string().min(1),
  timeMs: z.number().int().min(100).optional(),
  isCompleted: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
}).strict();

export const updateMetadataSchema = z.object({
  metadata: z.record(z.string(), z.unknown())
}).strict();
