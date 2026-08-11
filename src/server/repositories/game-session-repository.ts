import type { GameSession, GameType, Prisma } from '@prisma/client';

export type CreateGameSessionInput = {
  userId: string;
  clientRunId?: string;
  gameType: GameType;
  score: number;
  timeMs: number;
  metadata: Prisma.InputJsonValue;
};

export interface GameSessionRepository {
  findCompletedByUser(userId: string): Promise<GameSession[]>;
  findById(sessionId: string): Promise<GameSession | null>;
  findByClientRun(userId: string, clientRunId: string): Promise<GameSession | null>;
  createCompleted(input: CreateGameSessionInput): Promise<GameSession>;
  replaceMetadata(sessionId: string, metadata: Prisma.InputJsonValue): Promise<GameSession>;
}
