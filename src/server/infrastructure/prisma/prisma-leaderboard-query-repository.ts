import type { PrismaClient } from '@prisma/client';
import type {
  LeaderboardQueryRepository,
  LeaderboardUser,
  WeeklyLeaderboardEntry,
} from '../../repositories/leaderboard-query-repository.ts';

const userSelect = {
  id: true,
  pseudonym: true,
  experience: true,
  level: true,
  rating: true,
  _count: { select: { sessions: true } },
} as const;

export class PrismaLeaderboardQueryRepository implements LeaderboardQueryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findGlobal(limit: number): Promise<LeaderboardUser[]> {
    return this.prisma.user.findMany({
      where: { pseudonym: { not: null } },
      orderBy: { experience: 'desc' },
      take: limit,
      select: userSelect,
    });
  }

  async findWeekly(since: Date, limit: number): Promise<WeeklyLeaderboardEntry[]> {
    const weeklyTop = await this.prisma.xpEvent.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: since },
        user: { pseudonym: { not: null } },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: weeklyTop.map(({ userId }) => userId) } },
      select: userSelect,
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    return weeklyTop.map(({ userId, _sum }) => {
      const user = usersById.get(userId);
      return {
        id: userId,
        pseudonym: user?.pseudonym ?? null,
        experience: _sum.amount ?? 0,
        level: user?.level ?? 1,
        rating: user?.rating ?? 1000,
        _count: user?._count ?? { sessions: 0 },
      };
    });
  }
}
