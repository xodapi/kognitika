import type { PrismaClient } from '@prisma/client';
import type {
  DashboardRepository,
  DashboardSession,
  DashboardUser,
} from '../../repositories/dashboard-repository.ts';

export class PrismaDashboardRepository implements DashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findUser(userId: string): Promise<DashboardUser | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        level: true,
        experience: true,
        role: true,
        streakDays: true,
        lastPlayedAt: true,
      },
    });
  }

  findRecentCompletedSessions(userId: string, limit: number): Promise<DashboardSession[]> {
    return this.prisma.gameSession.findMany({
      where: { userId, isCompleted: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        gameType: true,
        score: true,
        createdAt: true,
      },
    });
  }
}
