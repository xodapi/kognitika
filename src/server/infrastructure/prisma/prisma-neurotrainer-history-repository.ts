import type { GameType, PrismaClient } from '@prisma/client';
import type {
  NeurotrainerHistoryRepository,
  NeurotrainerHistorySession,
} from '../../repositories/neurotrainer-history-repository.ts';

export class PrismaNeurotrainerHistoryRepository implements NeurotrainerHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findRecentCompletedByGameType(
    userId: string,
    gameType: string,
    limit: number,
  ): Promise<NeurotrainerHistorySession[]> {
    return this.prisma.gameSession.findMany({
      where: {
        userId,
        gameType: gameType as GameType,
        isCompleted: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        score: true,
        timeMs: true,
        metadata: true,
      },
    });
  }
}
