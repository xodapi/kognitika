type GameScoreInput = {
  gameType: string;
  timeMs: number;
  metadata?: Record<string, unknown>;
};

const MIN_SCORE = 10;
const MAX_SCORE = 1000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function numberFromMetadata(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function accuracyMultiplier(metadata: Record<string, unknown> | undefined) {
  const accuracy = numberFromMetadata(metadata, 'accuracy');
  if (accuracy !== null) return clamp(accuracy / 100, 0.2, 1);

  const correctAnswers = numberFromMetadata(metadata, 'correctAnswers');
  const totalQuestions = numberFromMetadata(metadata, 'totalQuestions');
  if (correctAnswers !== null && totalQuestions !== null && totalQuestions > 0) {
    return clamp(correctAnswers / totalQuestions, 0.2, 1);
  }

  return 1;
}

function complexityMultiplier(metadata: Record<string, unknown> | undefined) {
  const level = numberFromMetadata(metadata, 'level') || 1;
  const size = numberFromMetadata(metadata, 'size') || 3;
  const levelBonus = clamp(level, 1, 10) * 0.03;
  const sizeBonus = clamp(size - 3, 0, 7) * 0.04;

  return clamp(1 + levelBonus + sizeBonus, 1, 1.5);
}

function errorPenalty(metadata: Record<string, unknown> | undefined) {
  const errors = numberFromMetadata(metadata, 'errors') || 0;
  const misses = numberFromMetadata(metadata, 'misses') || 0;
  const falsePositives = numberFromMetadata(metadata, 'falsePositives') || numberFromMetadata(metadata, 'fp') || 0;

  return clamp(errors + misses + falsePositives, 0, 100) * 5;
}

export function computeServerScore({ timeMs, metadata }: GameScoreInput) {
  const speedScore = clamp(Math.floor(100000 / timeMs), MIN_SCORE, MAX_SCORE);
  const score = Math.round(
    speedScore * accuracyMultiplier(metadata) * complexityMultiplier(metadata) - errorPenalty(metadata),
  );

  return clamp(score, MIN_SCORE, MAX_SCORE);
}
