import type { PrismaClient } from '@prisma/client';
import type { AnalyticsSessionOwnershipRepository } from '../../repositories/analytics-session-ownership-repository.ts';

export class PrismaAnalyticsSessionOwnershipRepository implements AnalyticsSessionOwnershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async isOwnedBy(sessionId: string, userId: string): Promise<boolean> {
    return Boolean(await this.prisma.gameSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    }));
  }
}
