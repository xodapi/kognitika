import { z } from 'zod';

export const feedbackTypeSchema = z.enum(['idea', 'bug', 'improvement', 'other']);

export const feedbackSubmitSchema = z.object({
  type: feedbackTypeSchema,
  content: z.string().trim().min(1).max(5000),
  rating: z.number().min(1).max(5).optional(),
}).strict();

export const feedbackResponseSchema = z.object({
  response: z.string().trim().min(1).max(5000),
}).strict();
