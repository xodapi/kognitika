import { GameAttemptError, challengeMatches } from '../game-attempt.ts';

export interface AttemptContract {
  userId: string;
  gameType: string;
  clientRunId: string;
  challengeDigest: string;
  notBefore: Date;
  expiresAt: Date;
}

export interface SaveGameInput {
  userId: string;
  clientRunId?: string;
  attemptId?: string;
  challenge?: string;
  gameType: string;
  timeMs: number;
  metadata?: Record<string, unknown>;
  analyticsJob?: unknown;
}

/**
 * Validates game attempt credentials and temporal window.
 * 
 * Enforces:
 * - Attempt ownership
 * - Challenge digest match
 * - Game type consistency
 * - Client run ID consistency
 * - Temporal window (notBefore <= now < expiresAt)
 */
export class AttemptValidator {
  /**
   * Validates that attempt credentials match the input.
   * 
   * @throws {GameAttemptError} INVALID_ATTEMPT_CREDENTIALS if userId or challenge mismatch
   * @throws {GameAttemptError} ATTEMPT_CONTRACT_MISMATCH if gameType or clientRunId mismatch
   */
  validateContract(attempt: AttemptContract | null, input: SaveGameInput): void {
    if (
      !attempt
      || attempt.userId !== input.userId
      || !input.challenge
      || !challengeMatches(input.challenge, attempt.challengeDigest)
    ) {
      throw new GameAttemptError('Invalid game attempt credentials', 403, 'INVALID_ATTEMPT_CREDENTIALS');
    }

    if (attempt.gameType !== input.gameType || attempt.clientRunId !== input.clientRunId) {
      throw new GameAttemptError('Game attempt contract does not match', 409, 'ATTEMPT_CONTRACT_MISMATCH');
    }
  }

  /**
   * Validates that the attempt is within its temporal window.
   * 
   * @throws {GameAttemptError} ATTEMPT_NOT_READY if now < notBefore
   * @throws {GameAttemptError} ATTEMPT_EXPIRED if now >= expiresAt
   */
  validateWindow(attempt: AttemptContract, now: Date): void {
    if (now < attempt.notBefore) {
      throw new GameAttemptError('Game attempt is not ready', 409, 'ATTEMPT_NOT_READY');
    }
    if (now >= attempt.expiresAt) {
      throw new GameAttemptError('Game attempt has expired', 409, 'ATTEMPT_EXPIRED');
    }
  }

  /**
   * Validates that required attempt fields are present together.
   * 
   * @throws {GameAttemptError} INCOMPLETE_ATTEMPT if attemptId, challenge, or clientRunId is missing
   */
  validateInputCompleteness(input: SaveGameInput, hasAttempt: boolean): void {
    if (hasAttempt && (!input.attemptId || !input.challenge || !input.clientRunId)) {
      throw new GameAttemptError(
        'attemptId, challenge, and clientRunId are required together',
        400,
        'INCOMPLETE_ATTEMPT',
      );
    }

    if (!hasAttempt && process.env.GAME_SAVE_LEGACY_COMPAT_ENABLED !== 'true') {
      throw new GameAttemptError('A game attempt is required', 400, 'ATTEMPT_REQUIRED');
    }
  }
}
