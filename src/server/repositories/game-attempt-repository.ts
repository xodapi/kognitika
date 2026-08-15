export type GameAttemptRecord = {
  id: string;
  issuedAt: Date;
  notBefore: Date;
  expiresAt: Date;
};

export type CreateGameAttemptInput = {
  userId: string;
  gameType: string;
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
  create(input: CreateGameAttemptInput): Promise<GameAttemptRecord>;
  findById(attemptId: string): Promise<GameAttemptRecord | null>;
  /** Marks an unconsumed, in-window attempt as consumed. Returns false when another writer won the race. */
  reserve(attemptId: string, userId: string, now: Date): Promise<boolean>;
  attachSession(attemptId: string, gameSessionId: string): Promise<void>;
}
