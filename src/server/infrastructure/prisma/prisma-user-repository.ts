import type { PrismaClient, User } from '@prisma/client';
import type {
  LeaderboardEntry,
  RecordProgressInput,
  UserRepository,
} from '../../repositories/user-repository.ts';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async requireById(userId: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }

  async findTopByExperience(limit: number): Promise<LeaderboardEntry[]> {
    return this.prisma.user.findMany({
      take: limit,
      orderBy: { experience: 'desc' },
      select: {
        name: true,
        pseudonym: true,
        experience: true,
        level: true,
        rating: true,
        _count: { select: { sessions: true } },
      },
    });
  }

  async recordProgress(input: RecordProgressInput): Promise<User> {
    return this.prisma.user.update({
      where: { id: input.userId },
      data: {
        experience: { increment: input.experienceGain },
        streakDays: input.streakDays,
        lastPlayedAt: input.lastPlayedAt,
        ...(input.ratingGain !== undefined
          ? { rating: { increment: input.ratingGain } }
          : {}),
      },
    });
  }

  async setLevel(userId: string, level: number): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data: { level } });
  }
}
