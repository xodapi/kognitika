import { describe, expect, it, vi } from 'vitest';
import { PrismaDailyTrajectoryRepository } from '../server/infrastructure/prisma/prisma-daily-trajectory-repository.ts';

const validItem = {
  id: 'dp-1',
  category: 'cognitive',
  moduleId: 'schulte',
  title: 'Тренировка: Таблицы Шульте',
  reason: 'weak_area',
  status: 'planned',
  xpReward: 150,
};

function createPrismaMock(items: unknown = [validItem]) {
  return {
    gameSession: { findMany: vi.fn() },
    dailyPracticePlan: {
      findUnique: vi.fn().mockResolvedValue({ id: 'plan-1', items }),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('PrismaDailyTrajectoryRepository', () => {
  it('returns a valid persisted plan', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaDailyTrajectoryRepository(prisma as any);

    await expect(repository.findPlan('user-1', new Date('2026-08-24T00:00:00.000Z'))).resolves.toEqual({
      id: 'plan-1',
      items: [validItem],
    });
  });

  it('fails closed instead of trusting malformed persisted JSON', async () => {
    const prisma = createPrismaMock([{ ...validItem, status: 'unknown-status' }]);
    const repository = new PrismaDailyTrajectoryRepository(prisma as any);

    await expect(repository.findPlan('user-1', new Date('2026-08-24T00:00:00.000Z')))
      .rejects.toThrow('Invalid persisted daily practice plan items');
  });

  it('does not write malformed item data', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaDailyTrajectoryRepository(prisma as any);

    await expect(repository.replacePlanItems('plan-1', [{ ...validItem, xpReward: -1 }] as any))
      .rejects.toThrow('Invalid persisted daily practice plan items');
    expect(prisma.dailyPracticePlan.update).not.toHaveBeenCalled();
  });
});
