import type { PrismaClient } from '@prisma/client';
import type {
  AdminFeedbackRecord,
  AdminIdeaRecord,
  AdminRepository,
  AdminStats,
  AdminUserRecord,
} from '../../repositories/admin-repository.ts';

const identitySelect = {
  id: true,
  name: true,
  pseudonym: true,
  brainId: true,
} as const;

const feedbackInclude = {
  user: { select: identitySelect },
} as const;

export class PrismaAdminRepository implements AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findUsers(): Promise<AdminUserRecord[]> {
    return this.prisma.user.findMany({
      select: {
        ...identitySelect,
        level: true,
        experience: true,
        rating: true,
        streakDays: true,
        role: true,
        createdAt: true,
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            gameType: true,
            score: true,
            timeMs: true,
            isCompleted: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async getStats(): Promise<AdminStats> {
    const [userCount, sessionCount, scores] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.gameSession.count(),
      this.prisma.gameSession.aggregate({ _avg: { score: true } }),
    ]);
    return { userCount, sessionCount, averageScore: scores._avg.score };
  }

  findFeedback(): Promise<AdminFeedbackRecord[]> {
    return this.prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: feedbackInclude,
    });
  }

  respondToFeedback(id: string, response: string): Promise<AdminFeedbackRecord> {
    return this.prisma.feedback.update({
      where: { id },
      data: { adminResponse: response, status: 'replied' },
      include: feedbackInclude,
    });
  }

  updateIdeaStatus(id: string, status: string): Promise<AdminIdeaRecord> {
    return this.prisma.idea.update({ where: { id }, data: { status } });
  }
}
