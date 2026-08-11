import type { GameSession, PrismaClient } from '@prisma/client';
import type {
  CreateGameSessionInput,
  GameSessionRepository,
} from '../../repositories/game-session-repository.ts';
import type { Prisma } from '@prisma/client';

export class PrismaGameSessionRepository implements GameSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findCompletedByUser(userId: string): Promise<GameSession[]> {
    return this.prisma.gameSession.findMany({
      where: { userId, isCompleted: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(sessionId: string): Promise<GameSession | null> {
    return this.prisma.gameSession.findUnique({ where: { id: sessionId } });
  }

  async findByClientRun(userId: string, clientRunId: string): Promise<GameSession | null> {
    return this.prisma.gameSession.findUnique({
      where: { userId_clientRunId: { userId, clientRunId } },
    });
  }

  async createCompleted(input: CreateGameSessionInput): Promise<GameSession> {
    return this.prisma.gameSession.create({
      data: {
        userId: input.userId,
        clientRunId: input.clientRunId,
        gameType: input.gameType,
        score: input.score,
        timeMs: input.timeMs,
        isCompleted: true,
        metadata: input.metadata,
      },
    });
  }

  async replaceMetadata(sessionId: string, metadata: Prisma.InputJsonValue): Promise<GameSession> {
    return this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { metadata },
    });
  }
}
