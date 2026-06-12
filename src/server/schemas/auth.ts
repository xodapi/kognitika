import { z } from 'zod';

export const resumeSchema = z.object({
  brainId: z.string().min(1, 'ID сессии обязателен').max(120, 'ID сессии слишком длинный')
});
