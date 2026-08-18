import type { PrismaClient } from '@prisma/client';
import type {
  LongitudinalObservationRepository,
  LongitudinalObservationRow,
} from '../../repositories/longitudinal-observation-repository.ts';

export class PrismaLongitudinalObservationRepository implements LongitudinalObservationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findLongitudinalObservations(
    userId: string,
    moduleId: string,
    from: Date,
    to: Date,
  ): Promise<LongitudinalObservationRow[]> {
    const sessions = await this.prisma.gameSession.findMany({
      where: {
        userId,
        isCompleted: true,
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true },
    });

    if (sessions.length === 0) return [];

    const summaries = await this.prisma.sessionAnalyticsSummary.findMany({
      where: {
        userId,
        moduleId,
        completed: true,
        sourceSessionId: { in: sessions.map((session) => session.id) },
      },
      select: {
        sourceSessionId: true,
        accuracy: true,
        p50ReactionMs: true,
      },
    });

    const summaryBySession = new Map<string, typeof summaries[number]>();
    const duplicateSessionIds = new Set<string>();
    for (const summary of summaries) {
      if (summaryBySession.has(summary.sourceSessionId)) {
        duplicateSessionIds.add(summary.sourceSessionId);
      } else {
        summaryBySession.set(summary.sourceSessionId, summary);
      }
    }

    return sessions.flatMap((session) => {
      const summary = summaryBySession.get(session.id);
      if (!summary || duplicateSessionIds.has(session.id)) return [];
      return [{
        sourceSessionId: session.id,
        occurredAt: session.createdAt,
        accuracy: summary.accuracy,
        reactionMs: summary.p50ReactionMs,
      }];
    });
  }
}
