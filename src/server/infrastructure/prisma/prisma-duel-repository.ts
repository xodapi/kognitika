import type { PrismaClient } from '@prisma/client';
import type { DuelOutcome, DuelParticipant, DuelRepository } from '../../repositories/duel-repository.ts';

export class PrismaDuelRepository implements DuelRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findParticipant(userId: string): Promise<DuelParticipant | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        pseudonym: true,
        brainId: true,
        rating: true,
        role: true,
      },
    });
  }

  async recordOutcome(outcome: DuelOutcome): Promise<void> {
    const { winnerId, loserId, winnerRating, loserRating } = outcome;
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: winnerId },
        data: { rating: winnerRating, experience: { increment: 25 } },
      }),
      this.prisma.user.update({
        where: { id: loserId },
        data: { rating: loserRating, experience: { increment: 5 } },
      }),
      this.prisma.xpEvent.create({
        data: { userId: winnerId, amount: 25, reason: 'duel:win' },
      }),
      this.prisma.xpEvent.create({
        data: { userId: loserId, amount: 5, reason: 'duel:loss' },
      }),
    ]);
  }
}
