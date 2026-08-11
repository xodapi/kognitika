import type { GameType, PrismaClient } from '@prisma/client';
import type {
  AnalyticsSession,
  AnalyticsSessionRepository,
} from '../../repositories/analytics-session-repository.ts';

const analyticsSessionSelect = {
  gameType: true,
  score: true,
  timeMs: true,
  createdAt: true,
} as const;

export class PrismaAnalyticsSessionRepository implements AnalyticsSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findCompletedByUser(userId: string, limit?: number): Promise<AnalyticsSession[]> {
    return this.prisma.gameSession.findMany({
      where: { userId, isCompleted: true },
      orderBy: { createdAt: 'desc' },
      select: analyticsSessionSelect,
      ...(limit === undefined ? {} : { take: limit }),
    });
  }

  async findRecentCompletedByUserAndGameType(
    userId: string,
    gameType: string,
    limit: number,
  ): Promise<AnalyticsSession[]> {
    return this.prisma.gameSession.findMany({
      where: { userId, gameType: gameType as GameType, isCompleted: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: analyticsSessionSelect,
    });
  }

  async countCompletedByGameType(gameType: string): Promise<number> {
    return this.prisma.gameSession.count({
      where: { gameType: gameType as GameType, isCompleted: true },
    });
  }

  async countCompletedWithScoreBelow(gameType: string, score: number): Promise<number> {
    return this.prisma.gameSession.count({
      where: {
        gameType: gameType as GameType,
        isCompleted: true,
        score: { lt: score },
      },
    });
  }
}
