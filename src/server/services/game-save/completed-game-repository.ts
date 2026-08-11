import type { GameSession, User } from '@prisma/client';
import type { SaveGameInput } from './attempt-validator.ts';
import type { CompletedSessionAnalyticsJob } from '../../../core/cognitive-events/index.ts';

export interface CompleteGameCommand {
  input: SaveGameInput;
  score: number;
  analyticsJob?: CompletedSessionAnalyticsJob;
}

export interface SaveGameResult {
  session: GameSession;
  user: User;
  isReplay: boolean;
}

/**
 * Repository for completing game sessions with full transactional integrity.
 * 
 * Responsibilities:
 * - Idempotency resolution (replay detection)
 * - Atomic session creation
 * - User progress update (XP, level, streak)
 * - Analytics job persistence
 * - Analytics outbox entry
 * - Attempt consumption
 */
export interface CompletedGameRepository {
  /**
   * Completes a game session within a transaction.
   * 
   * Handles:
   * - Replay detection via clientRunId or consumedAt attempt
   * - User experience increment
   * - Level calculation
   * - Streak update
   * - Analytics job creation
   * - Analytics outbox entry (if enabled)
   * - XpEvent recording
   * 
   * @returns The created session, updated user, and replay flag
   */
  complete(command: CompleteGameCommand): Promise<SaveGameResult>;
}
