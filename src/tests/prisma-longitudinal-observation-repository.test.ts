import { describe, expect, it, vi } from 'vitest';
import { PrismaLongitudinalObservationRepository } from '../server/infrastructure/prisma/prisma-longitudinal-observation-repository.ts';

describe('PrismaLongitudinalObservationRepository', () => {
  it('joins authenticated completed sessions to one matching module summary using session creation time', async () => {
    const prisma = {
      gameSession: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'session-a', createdAt: new Date('2026-08-01T00:00:00.000Z') },
          { id: 'session-b', createdAt: new Date('2026-08-02T00:00:00.000Z') },
        ]),
      },
      sessionAnalyticsSummary: {
        findMany: vi.fn().mockResolvedValue([
          { sourceSessionId: 'session-a', accuracy: 0.9, p50ReactionMs: 180 },
          { sourceSessionId: 'session-b', accuracy: 0.8, p50ReactionMs: 200 },
          { sourceSessionId: 'session-b', accuracy: 0.7, p50ReactionMs: 210 },
        ]),
      },
    };
    const from = new Date('2026-05-22T00:00:00.000Z');
    const to = new Date('2026-08-20T00:00:00.000Z');

    const rows = await new PrismaLongitudinalObservationRepository(prisma as any)
      .findLongitudinalObservations('user-a', 'nback', from, to);

    expect(rows).toEqual([{
      sourceSessionId: 'session-a',
      occurredAt: new Date('2026-08-01T00:00:00.000Z'),
      accuracy: 0.9,
      reactionMs: 180,
    }]);
    expect(prisma.gameSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-a', isCompleted: true, createdAt: { gte: from, lte: to } },
      select: { id: true, createdAt: true },
    }));
    expect(prisma.sessionAnalyticsSummary.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 'user-a',
        moduleId: 'nback',
        completed: true,
        sourceSessionId: { in: ['session-a', 'session-b'] },
      }),
      select: { sourceSessionId: true, accuracy: true, p50ReactionMs: true },
    }));
  });
});
