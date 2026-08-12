import type { GameType, PrismaClient } from '@prisma/client';
import {
  GameAttemptConflictError,
  type CreateGameAttemptInput,
  type GameAttemptRecord,
  type GameAttemptRepository,
} from '../../repositories/game-attempt-repository.ts';

export class PrismaGameAttemptRepository implements GameAttemptRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateGameAttemptInput): Promise<GameAttemptRecord> {
    try {
      return await this.prisma.gameAttempt.create({
        data: { ...input, gameType: input.gameType as GameType },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new GameAttemptConflictError();
      throw error;
    }
  }

  async findById(attemptId: string): Promise<GameAttemptRecord | null> {
    return this.prisma.gameAttempt.findUnique({ where: { id: attemptId } });
  }

  async reserve(attemptId: string, userId: string, now: Date): Promise<boolean> {
    const result = await this.prisma.gameAttempt.updateMany({
      where: {
        id: attemptId,
        userId,
        consumedAt: null,
        gameSessionId: null,
        notBefore: { lte: now },
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    return result.count === 1;
  }

  async attachSession(attemptId: string, gameSessionId: string): Promise<void> {
    await this.prisma.gameAttempt.update({
      where: { id: attemptId },
      data: { gameSessionId },
    });
  }
}
