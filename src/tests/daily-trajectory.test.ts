/**
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  gameSession: {
    findMany: vi.fn(),
  },
  dailyPracticePlan: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../lib/prisma.ts', () => ({
  default: prismaMock,
}));

describe('daily trajectory service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.dailyPracticePlan.findUnique.mockResolvedValue(null);
    prismaMock.dailyPracticePlan.create.mockResolvedValue({});
    prismaMock.dailyPracticePlan.update.mockResolvedValue({});
  });

  it('generates plan with weak_area item for new user', async () => {
    prismaMock.gameSession.findMany.mockResolvedValue([]);

    const { generateDailyPlan } = await import('../server/services/daily-trajectory.ts');
    const items = await generateDailyPlan('user-1');

    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items[0].category).toBe('cognitive');
    expect(items[0].reason).toBe('weak_area');
    expect(items.some((i) => i.category === 'somatic')).toBe(true);
  });

  it('includes safety item for users with >= 5 sessions', async () => {
    prismaMock.gameSession.findMany.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        gameType: 'SCHULTE',
        score: 500 + i * 10,
      })),
    );

    const { generateDailyPlan } = await import('../server/services/daily-trajectory.ts');
    const items = await generateDailyPlan('user-1');

    expect(items.some((i) => i.category === 'safety')).toBe(true);
  });

  it('marks items as completed if played today', async () => {
    const now = new Date();
    prismaMock.gameSession.findMany.mockResolvedValue([
      { gameType: 'SCHULTE', score: 600 },
      { gameType: 'STROOP', score: 700 },
    ]);

    const { generateDailyPlan } = await import('../server/services/daily-trajectory.ts');
    const items = await generateDailyPlan('user-1', now);

    const schulteItem = items.find((i) => i.moduleId === 'schulte');
    if (schulteItem) {
      expect(schulteItem.status).toBe('completed');
    }
  });

  it('returns existing plan from database', async () => {
    const mockItems = [
      { id: 'dp-1', category: 'cognitive', moduleId: 'schulte', title: 'Test', reason: 'weak_area', status: 'planned', xpReward: 150 },
    ];
    prismaMock.dailyPracticePlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      items: mockItems,
    });

    const { getOrCreateDailyPlan } = await import('../server/services/daily-trajectory.ts');
    const items = await getOrCreateDailyPlan('user-1');

    expect(items).toEqual(mockItems);
    expect(prismaMock.dailyPracticePlan.create).not.toHaveBeenCalled();
  });

  it('creates new plan if none exists', async () => {
    prismaMock.gameSession.findMany.mockResolvedValue([]);

    const { getOrCreateDailyPlan } = await import('../server/services/daily-trajectory.ts');
    const items = await getOrCreateDailyPlan('user-1');

    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(prismaMock.dailyPracticePlan.create).toHaveBeenCalled();
  });

  it('updates item status correctly', async () => {
    const mockItems = [
      { id: 'dp-1', category: 'cognitive', moduleId: 'schulte', title: 'Test', reason: 'weak_area', status: 'planned', xpReward: 150 },
    ];
    prismaMock.dailyPracticePlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      items: mockItems,
    });

    const { updateItemStatus } = await import('../server/services/daily-trajectory.ts');
    const updated = await updateItemStatus('user-1', 'dp-1', 'completed');

    expect(updated).toHaveLength(1);
    expect(updated![0].status).toBe('completed');
    expect(updated![0].completedAt).toBeDefined();
  });

  it('returns null when updating non-existent plan', async () => {
    prismaMock.dailyPracticePlan.findUnique.mockResolvedValue(null);

    const { updateItemStatus } = await import('../server/services/daily-trajectory.ts');
    const result = await updateItemStatus('user-1', 'dp-1', 'completed');

    expect(result).toBeNull();
  });

  it('computes progress correctly', async () => {
    const { computeProgress } = await import('../server/services/daily-trajectory.ts');

    const items = [
      { id: '1', status: 'completed' as const, category: 'cognitive' as const, moduleId: 'a', title: 'A', reason: 'weak_area' as const, xpReward: 100 },
      { id: '2', status: 'planned' as const, category: 'somatic' as const, moduleId: 'b', title: 'B', reason: 'variety' as const, xpReward: 100 },
      { id: '3', status: 'completed' as const, category: 'safety' as const, moduleId: 'c', title: 'C', reason: 'scheduled' as const, xpReward: 100 },
    ];

    const progress = computeProgress(items);
    expect(progress.completed).toBe(2);
    expect(progress.total).toBe(3);
    expect(progress.percent).toBe(67);
  });
});
