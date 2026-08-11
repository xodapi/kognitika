import type { GameAttempt, GameType } from '@prisma/client';

export type CreateGameAttemptInput = {
  userId: string;
  gameType: GameType;
  clientRunId: string;
  challengeDigest: string;
  issuedAt: Date;
  notBefore: Date;
  expiresAt: Date;
};

export class GameAttemptConflictError extends Error {
  constructor() {
    super('A game attempt already exists for this run');
    this.name = 'GameAttemptConflictError';
  }
}

export interface GameAttemptRepository {
  /** Throws {@link GameAttemptConflictError} when the (userId, clientRunId) pair is taken. */
  create(input: CreateGameAttemptInput): Promise<GameAttempt>;
  findById(attemptId: string): Promise<GameAttempt | null>;
  /** Marks an unconsumed, in-window attempt as consumed. Returns false when another writer won the race. */
  reserve(attemptId: string, userId: string, now: Date): Promise<boolean>;
  attachSession(attemptId: string, gameSessionId: string): Promise<void>;
}
