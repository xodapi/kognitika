import { z } from 'zod';

export const saveGameSchema = z.object({
  gameType: z.string(),
  timeMs: z.number().optional(),
  score: z.number().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});
