import { computeServerScore } from './game-score.ts';
import { AttemptValidator, type SaveGameInput } from './game-save/attempt-validator.ts';
import { AnalyticsJobValidator } from './game-save/analytics-job-validator.ts';
import { getGameRepositories } from '../infrastructure/container.ts';
import { GameAttemptError } from './game-attempt.ts';
import type { SaveGameResult as CompletedGameSaveResult } from './game-save/completed-game-repository.ts';

export type { SaveGameInput } from './game-save/attempt-validator.ts';

export type SaveGameResult = CompletedGameSaveResult;

// Validators and policies
const attemptValidator = new AttemptValidator();
const analyticsJobValidator = new AnalyticsJobValidator();

/**
 * Orchestrates the game completion flow.
 * 
 * Responsibilities:
 * - Validates input completeness and analytics job
 * - Computes server-side score
 * - Validates attempt contract and window (if present)
 * - Delegates transactional persistence to CompletedGameRepository
 * 
 * The repository handles:
 * - Idempotency resolution
 * - Session creation
 * - User progress update
 * - Analytics job/outbox persistence
 * - XP event creation
 */
export async function saveCompletedGame(input: SaveGameInput): Promise<SaveGameResult> {
  const hasAttempt = Boolean(input.attemptId || input.challenge);

  // Validate input completeness
  attemptValidator.validateInputCompleteness(input, hasAttempt);

  // Validate analytics job (if provided)
  const analyticsJob = analyticsJobValidator.validate(input);

  // Compute server-side score
  const score = computeServerScore(input);

  // Pre-transaction validation for attempt-based flow
  if (hasAttempt) {
    // Attempt contract and window validation happens inside the transaction
    // to ensure atomic reservation, but we keep the validator interface
    // available for potential future optimization or testing.
  }

  // Delegate to repository for transactional persistence
  const repos = getGameRepositories();
  return repos.completedGames.complete({
    input,
    score,
    analyticsJob,
  });
}

// Re-export error for route-level handling
export { GameAttemptError };
