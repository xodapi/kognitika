import type { PrismaClient } from '@prisma/client';
import type {
  DailyPracticePlanRecord,
  DailyTrajectoryRepository,
  DailyTrajectorySession,
} from '../../repositories/daily-trajectory-repository.ts';
import type { DailyPracticeItem } from '../../../lib/daily-practice-types.ts';

export class PrismaDailyTrajectoryRepository implements DailyTrajectoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findRecentCompletedSessions(userId: string, limit: number): Promise<DailyTrajectorySession[]> {
    return this.prisma.gameSession.findMany({
      where: { userId, isCompleted: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { gameType: true, score: true, createdAt: true },
    });
  }

  async findPlan(userId: string, date: Date): Promise<DailyPracticePlanRecord | null> {
    const plan = await this.prisma.dailyPracticePlan.findUnique({
      where: { userId_date: { userId, date } },
      select: { id: true, items: true },
    });
    return plan ? { id: plan.id, items: plan.items as unknown as DailyPracticeItem[] } : null;
  }

  async createPlan(userId: string, date: Date, items: DailyPracticeItem[]): Promise<void> {
    await this.prisma.dailyPracticePlan.create({ data: { userId, date, items: items as unknown as object } });
  }

  async replacePlanItems(planId: string, items: DailyPracticeItem[]): Promise<void> {
    await this.prisma.dailyPracticePlan.update({
      where: { id: planId },
      data: { items: items as unknown as object },
    });
  }
}
