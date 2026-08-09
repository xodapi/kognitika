import prisma from '../../lib/prisma.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import {
  type DailyPracticeItem,
  type DailyPracticeItemStatus,
  DAILY_PRACTICE_MODULE_TITLES,
} from '../../lib/daily-practice-types.ts';
import { NEXT_MODULE, normalizePracticeModuleId } from '../../lib/practice-recommendations.ts';

const logger = createSafeLogger('daily-trajectory');

function toISOStringDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function titleFor(moduleId: string): string {
  return DAILY_PRACTICE_MODULE_TITLES[moduleId] || moduleId;
}

// Declaration order is the deterministic tie-break for untrained domains,
// so a brand-new user always receives the same entry module.
const SKILL_DOMAINS = [
  { games: ['SCHULTE', 'STROOP', 'SPEED_TYPING', 'N_BACK', 'NOISE_REDUCTION'], defaultGame: 'schulte' },
  { games: ['N_BACK', 'SPATIAL_CONCEALMENT', 'TOPOLOGY_MEMORY'], defaultGame: 'nback' },
  { games: ['NUMERICAL_ANALYSIS', 'LOGICAL_SEQUENCE', 'LANGUAGE_SCANNER', 'DECRYPTOR', 'REALITY_CHECK', 'OBJECTIVE_FILTER', 'PROFILING_RICE'], defaultGame: 'logical' },
  { games: ['SPEED_TYPING', 'SCHULTE', 'COLLISION_DETECTOR'], defaultGame: 'typing' },
  { games: ['ASYNC_DISPATCHER', 'COLLISION_DETECTOR', 'NOISE_REDUCTION'], defaultGame: 'dispatcher' },
] as const;

function findWeakestModule(sessions: Array<{ gameType: string; score: number }>): string {
  const totals = SKILL_DOMAINS.map((domain) => {
    let sum = 0;
    let count = 0;
    for (const session of sessions) {
      if (domain.games.includes(session.gameType as never)) {
        sum += session.score;
        count += 1;
      }
    }
    return { defaultGame: domain.defaultGame, sum, count };
  });

  // An untrained domain is weaker than any trained one: it has no evidence at all.
  const untrained = totals.find((domain) => domain.count === 0);
  if (untrained) return untrained.defaultGame;

  let weakest = totals[0];
  let minAvg = Infinity;
  for (const domain of totals) {
    const avg = domain.sum / domain.count;
    if (avg < minAvg) {
      minAvg = avg;
      weakest = domain;
    }
  }

  return weakest.defaultGame;
}

function findNextVarietyModule(lastModuleId: string): string {
  return NEXT_MODULE[lastModuleId] || 'schulte';
}

let idCounter = 0;
function nextItemId(): string {
  idCounter += 1;
  return `dp-${Date.now()}-${idCounter}`;
}

export async function generateDailyPlan(userId: string, date?: Date): Promise<DailyPracticeItem[]> {
  const targetDate = date || new Date();
  const dateStr = toISOStringDate(targetDate);

  const sessions = await prisma.gameSession.findMany({
    where: { userId, isCompleted: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const todayStart = new Date(targetDate);
  todayStart.setHours(0, 0, 0, 0);
  const todaySessions = sessions.filter((s) => new Date(s.createdAt) >= todayStart);

  const playedToday = new Set(todaySessions.map((s) => normalizePracticeModuleId(s.gameType)));

  const weakModule = findWeakestModule(sessions);

  const items: DailyPracticeItem[] = [];

  items.push({
    id: nextItemId(),
    category: 'cognitive',
    moduleId: weakModule,
    title: `Тренировка: ${titleFor(weakModule)}`,
    reason: 'weak_area',
    status: playedToday.has(weakModule) ? 'completed' : 'planned',
    completedAt: playedToday.has(weakModule) ? todayStart.toISOString() : undefined,
    xpReward: 150,
  });

  const lastModule = sessions.length > 0
    ? normalizePracticeModuleId(sessions[0].gameType)
    : 'schulte';
  const varietyModule = findNextVarietyModule(lastModule);
  if (varietyModule !== weakModule) {
    items.push({
      id: nextItemId(),
      category: 'cognitive',
      moduleId: varietyModule,
      title: `Разнообразие: ${titleFor(varietyModule)}`,
      reason: 'variety',
      status: playedToday.has(varietyModule) ? 'completed' : 'planned',
      completedAt: playedToday.has(varietyModule) ? todayStart.toISOString() : undefined,
      xpReward: 100,
    });
  }

  const somaticItem: DailyPracticeItem = {
    id: nextItemId(),
    category: 'somatic',
    moduleId: 'silence',
    title: `Восстановление: ${titleFor('silence')}`,
    reason: 'recovery',
    status: playedToday.has('silence') ? 'completed' : 'planned',
    completedAt: playedToday.has('silence') ? todayStart.toISOString() : undefined,
    xpReward: 80,
  };
  items.push(somaticItem);

  if (sessions.length >= 5) {
    const safetyModule = 'scanner';
    items.push({
      id: nextItemId(),
      category: 'safety',
      moduleId: safetyModule,
      title: `Безопасность: ${titleFor(safetyModule)}`,
      reason: 'scheduled',
      status: playedToday.has(safetyModule) ? 'completed' : 'planned',
      completedAt: playedToday.has(safetyModule) ? todayStart.toISOString() : undefined,
      xpReward: 70,
    });
  }

  return items;
}

export async function getDailyPlan(userId: string, date?: Date): Promise<DailyPracticeItem[] | null> {
  const targetDate = date || new Date();
  const dateStr = toISOStringDate(targetDate);

  const plan = await prisma.dailyPracticePlan.findUnique({
    where: { userId_date: { userId, date: new Date(dateStr) } },
  });

  if (!plan) return null;

  return plan.items as unknown as DailyPracticeItem[];
}

export async function getOrCreateDailyPlan(userId: string, date?: Date): Promise<DailyPracticeItem[]> {
  const existing = await getDailyPlan(userId, date);
  if (existing) return existing;

  const items = await generateDailyPlan(userId, date);
  const targetDate = date || new Date();
  const dateStr = toISOStringDate(targetDate);

  try {
    await prisma.dailyPracticePlan.create({
      data: {
        userId,
        date: new Date(dateStr),
        items: items as unknown as object,
      },
    });
  } catch (err) {
    logger.error('Failed to persist daily plan', { error: safeError(err), userId });
  }

  return items;
}

export async function updateItemStatus(
  userId: string,
  itemId: string,
  status: DailyPracticeItemStatus,
  date?: Date,
): Promise<DailyPracticeItem[] | null> {
  const targetDate = date || new Date();
  const dateStr = toISOStringDate(targetDate);

  const plan = await prisma.dailyPracticePlan.findUnique({
    where: { userId_date: { userId, date: new Date(dateStr) } },
  });

  if (!plan) return null;

  const items = plan.items as unknown as DailyPracticeItem[];
  const updated = items.map((item) => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : item.completedAt,
    };
  });

  try {
    await prisma.dailyPracticePlan.update({
      where: { id: plan.id },
      data: { items: updated as unknown as object },
    });
  } catch (err) {
    logger.error('Failed to update item status', { error: safeError(err), userId, itemId });
  }

  return updated;
}

export function computeProgress(items: DailyPracticeItem[]): { completed: number; total: number; percent: number } {
  const total = items.length;
  const completed = items.filter((i) => i.status === 'completed').length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
