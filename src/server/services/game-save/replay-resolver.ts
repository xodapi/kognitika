import { GameAttemptError } from '../game-attempt.ts';
import type { SaveGameInput } from './attempt-validator.ts';

export type ReplaySession = {
  userId: string;
  clientRunId: string | null;
  gameType: string;
  timeMs: number;
  score: number;
};

/**
 * Resolves idempotent replay scenarios when a game with the same
 * clientRunId has already been saved.
 * 
 * Enforces strict replay contract: userId, clientRunId, gameType, timeMs, and score
 * must all match exactly.
 */
export class ReplayResolver {
  /**
   * Asserts that a replay attempt matches the original session exactly.
   * 
   * @throws {GameAttemptError} ATTEMPT_REPLAY_CONFLICT if any field differs
   */
  assertReplayMatches(session: ReplaySession, input: SaveGameInput, score: number): void {
    if (
      session.userId !== input.userId
      || session.clientRunId !== input.clientRunId
      || session.gameType !== input.gameType
      || session.timeMs !== input.timeMs
      || session.score !== score
    ) {
      throw new GameAttemptError('Game save conflicts with the completed attempt', 409, 'ATTEMPT_REPLAY_CONFLICT');
    }
  }
}
