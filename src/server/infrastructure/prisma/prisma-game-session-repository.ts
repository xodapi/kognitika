import type { GameSession, GameType, PrismaClient, Prisma } from '@prisma/client';
import type {
  CreateGameSessionInput,
  GameSessionRecord,
  GameSessionRepository,
  JsonValue,
} from '../../repositories/game-session-repository.ts';

function toRecord(session: GameSession): GameSessionRecord {
  return session as unknown as GameSessionRecord;
}

export class PrismaGameSessionRepository implements GameSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findCompletedByUser(userId: string): Promise<GameSessionRecord[]> {
    const sessions = await this.prisma.gameSession.findMany({
      where: { userId, isCompleted: true },
      orderBy: { createdAt: 'asc' },
    });
    return sessions.map(toRecord);
  }

  async findById(sessionId: string): Promise<GameSessionRecord | null> {
    const session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });
    return session ? toRecord(session) : null;
  }

  async findByClientRun(userId: string, clientRunId: string): Promise<GameSessionRecord | null> {
    const session = await this.prisma.gameSession.findUnique({
      where: { userId_clientRunId: { userId, clientRunId } },
    });
    return session ? toRecord(session) : null;
  }

  async createCompleted(input: CreateGameSessionInput): Promise<GameSessionRecord> {
    const session = await this.prisma.gameSession.create({
      data: {
        userId: input.userId,
        clientRunId: input.clientRunId,
        gameType: input.gameType as GameType,
        score: input.score,
        timeMs: input.timeMs,
        isCompleted: true,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
    return toRecord(session);
  }

  async replaceMetadata(sessionId: string, metadata: JsonValue): Promise<GameSessionRecord> {
    const session = await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });
    return toRecord(session);
  }
}
