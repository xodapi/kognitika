export function deriveTrainingMetrics(input: {
  timeMs: number;
  score: number;
  errors: number;
  correctAnswers?: number;
  totalQuestions?: number;
}) {
  const { timeMs, score, errors, correctAnswers, totalQuestions } = input;
  const accuracy = typeof correctAnswers === 'number' && typeof totalQuestions === 'number' && totalQuestions > 0
    ? Math.max(0, Math.min(100, (correctAnswers / totalQuestions) * 100))
    : Math.max(0, Math.min(100, 100 - errors * 8));
  const reactionMs = Math.round(timeMs / Math.max(1, (totalQuestions ?? score) || 1));
  return { accuracy, reactionMs };
}
