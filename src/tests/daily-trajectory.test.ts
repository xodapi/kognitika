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
    // Every domain carries evidence so the weak area is decided by average score
    // rather than by absence of data. Attention is the weakest, which puts
    // schulte in the plan, and schulte was played today.
    prismaMock.gameSession.findMany.mockResolvedValue([
      { gameType: 'SCHULTE', score: 100, createdAt: now },
      { gameType: 'TOPOLOGY_MEMORY', score: 900, createdAt: now },
      { gameType: 'NUMERICAL_ANALYSIS', score: 900, createdAt: now },
      { gameType: 'ASYNC_DISPATCHER', score: 900, createdAt: now },
      { gameType: 'COLLISION_DETECTOR', score: 900, createdAt: now },
    ]);

    const { generateDailyPlan } = await import('../server/services/daily-trajectory.ts');
    const items = await generateDailyPlan('user-1', now);

    const schulteItem = items.find((i) => i.moduleId === 'schulte');
    expect(schulteItem).toBeDefined();
    expect(schulteItem!.status).toBe('completed');
    expect(schulteItem!.completedAt).toBeDefined();
  });

  it('leaves items planned when the module was not played today', async () => {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    prismaMock.gameSession.findMany.mockResolvedValue([
      { gameType: 'SCHULTE', score: 100, createdAt: lastWeek },
      { gameType: 'TOPOLOGY_MEMORY', score: 900, createdAt: lastWeek },
      { gameType: 'NUMERICAL_ANALYSIS', score: 900, createdAt: lastWeek },
      { gameType: 'ASYNC_DISPATCHER', score: 900, createdAt: lastWeek },
      { gameType: 'COLLISION_DETECTOR', score: 900, createdAt: lastWeek },
    ]);

    const { generateDailyPlan } = await import('../server/services/daily-trajectory.ts');
    const items = await generateDailyPlan('user-1', now);

    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.status).toBe('planned');
      expect(item.completedAt).toBeUndefined();
    }
  });

  it('resolves multi-word game types to canonical module ids', async () => {
    const now = new Date();
    prismaMock.gameSession.findMany.mockResolvedValue([
      { gameType: 'N_BACK', score: 400, createdAt: now },
      { gameType: 'SPEED_TYPING', score: 420, createdAt: now },
      { gameType: 'SPATIAL_CONCEALMENT', score: 430, createdAt: now },
    ]);

    const { generateDailyPlan } = await import('../server/services/daily-trajectory.ts');
    const items = await generateDailyPlan('user-1', now);

    // Naive `toLowerCase().replace(/_/g, '-')` normalization produced ids such as
    // 'n-back' and 'speed-typing', which never matched a real module.
    for (const item of items) {
      expect(item.moduleId).not.toMatch(/^n-back$|^speed-typing$|^spatial-concealment$/);
    }

    const nbackItem = items.find((i) => i.moduleId === 'nback');
    if (nbackItem) {
      expect(nbackItem.status).toBe('completed');
    }
  });

  it('advances variety from the last played module rather than falling back to schulte', async () => {
    const now = new Date();
    // NEXT_MODULE maps nback -> numerical. A broken normalization loses the
    // mapping and silently degrades every plan to the schulte default.
    prismaMock.gameSession.findMany.mockResolvedValue([
      { gameType: 'N_BACK', score: 500, createdAt: now },
    ]);

    const { generateDailyPlan } = await import('../server/services/daily-trajectory.ts');
    const items = await generateDailyPlan('user-1', now);

    const varietyItem = items.find((i) => i.reason === 'variety');
    expect(varietyItem).toBeDefined();
    expect(varietyItem!.moduleId).toBe('numerical');
  });

  it('treats an untrained domain as the weakest area', async () => {
    const now = new Date();
    // Attention is heavily trained with strong scores; logic has no evidence at
    // all and must therefore win the weak-area slot.
    prismaMock.gameSession.findMany.mockResolvedValue(
      Array.from({ length: 6 }, () => ({ gameType: 'SCHULTE', score: 900, createdAt: now })),
    );

    const { generateDailyPlan } = await import('../server/services/daily-trajectory.ts');
    const items = await generateDailyPlan('user-1', now);

    const weakItem = items.find((i) => i.reason === 'weak_area');
    expect(weakItem).toBeDefined();
    expect(weakItem!.moduleId).not.toBe('schulte');
  });

  it('generates a deterministic plan for a new user', async () => {
    prismaMock.gameSession.findMany.mockResolvedValue([]);

    const { generateDailyPlan } = await import('../server/services/daily-trajectory.ts');
    const first = await generateDailyPlan('user-1');
    const second = await generateDailyPlan('user-1');

    expect(first.map((i) => i.moduleId)).toEqual(second.map((i) => i.moduleId));
    expect(first.map((i) => i.reason)).toEqual(second.map((i) => i.reason));
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
