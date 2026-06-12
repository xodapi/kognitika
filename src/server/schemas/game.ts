import { z } from 'zod';

export const saveGameSchema = z.object({
  gameType: z.string().min(1),
  timeMs: z.number().int().min(100).optional(),
  isCompleted: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
}).strict();
