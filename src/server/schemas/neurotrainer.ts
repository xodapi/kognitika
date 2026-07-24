import { z } from 'zod';

export const MentalMathLevelSchema = z.union([z.literal(1), z.literal(2)]);

export const GenerateMentalMathRequestSchema = z.object({
  level: MentalMathLevelSchema,
  count: z.number().int().min(20).max(30),
}).strict();

export const MathLegendSchema = z.record(
  z.string().min(1).max(3),
  z.enum(['+', '-', '*', '/']),
);

export const MathQuestionSchema = z.object({
  equation: z.string().min(3).max(80),
  answer: z.number().int().min(1).max(200),
  display: z.string().min(5).max(90),
}).strict();

export const GeneratedMentalMathSetSchema = z.object({
  legend: MathLegendSchema,
  questions: z.array(MathQuestionSchema).min(1).max(30),
}).strict();

export const NeurotrainerGameTypeSchema = z.enum(['MENTAL_MATH', 'SCHULTE_90']);

export const AnalyzeTrainingRequestSchema = z.object({
  gameType: NeurotrainerGameTypeSchema,
  timeMs: z.number().int().min(100).max(30 * 60 * 1000),
  errors: z.number().int().min(0).max(1000),
  correctAnswers: z.number().int().min(0).max(1000).optional(),
  totalQuestions: z.number().int().min(1).max(1000).optional(),
  level: z.number().int().min(1).max(10).optional(),
}).strict();

export const PrivacySafeHistoryEntrySchema = z.object({
  timeMs: z.number().int().min(100).max(30 * 60 * 1000),
  score: z.number().int().min(0).max(1000),
  errors: z.number().int().min(0).max(1000),
  accuracy: z.number().min(0).max(100),
}).strict();

export const NeurotrainerAnalysisSchema = z.object({
  feedback: z.string().min(1).max(500),
  recommendations: z.array(z.string().min(1).max(200)).min(1).max(3),
}).strict();

export type GenerateMentalMathRequest = z.infer<typeof GenerateMentalMathRequestSchema>;
export type GeneratedMentalMathSet = z.infer<typeof GeneratedMentalMathSetSchema>;
export type AnalyzeTrainingRequest = z.infer<typeof AnalyzeTrainingRequestSchema>;
export type PrivacySafeHistoryEntry = z.infer<typeof PrivacySafeHistoryEntrySchema>;
export type NeurotrainerAnalysis = z.infer<typeof NeurotrainerAnalysisSchema>;
