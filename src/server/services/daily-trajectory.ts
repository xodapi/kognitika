import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import { getDailyTrajectoryRepository } from '../infrastructure/container.ts';
import {
  type DailyPracticeItem,
  type DailyPracticeItemStatus,
  DAILY_PRACTICE_MODULE_TITLES,
} from '../../lib/daily-practice-types.ts';
import { NEXT_MODULE, resolvePracticeModuleId } from '../../lib/practice-recommendations.ts';

const logger = createSafeLogger('daily-trajectory');

const COGNITIVE_MODULES = ['schulte', 'stroop', 'nback', 'numerical', 'logical', 'spatial', 'topology', 'collision', 'dispatcher', 'noise', 'typing'];
const SOMATIC_MODULES = ['silence'];
const SAFETY_MODULES = ['scanner', 'decryptor', 'reality', 'filter', 'hype', 'reframing', 'rejection'];

function toISOStringDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayKey(): string {
  return toISOStringDate(new Date());
}

function titleFor(moduleId: string): string {
  return DAILY_PRACTICE_MODULE_TITLES[moduleId] || moduleId;
}

function findWeakestModule(sessions: Array<{ gameType: string; score: number }>): string {
  if (sessions.length === 0) return 'nback';

  const domainMap: Record<string, { modules: string[]; sum: number; count: number; defaultModule: string }> = {
    attention: { modules: ['schulte', 'stroop', 'typing', 'nback', 'noise'], sum: 0, count: 0, defaultModule: 'schulte' },
    memory: { modules: ['nback', 'spatial', 'topology'], sum: 0, count: 0, defaultModule: 'nback' },
    logic: { modules: ['numerical', 'logical', 'scanner', 'decryptor', 'reality', 'objective', 'profiling'], sum: 0, count: 0, defaultModule: 'logical' },
    speed: { modules: ['typing', 'schulte', 'collision'], sum: 0, count: 0, defaultModule: 'typing' },
    resilience: { modules: ['dispatcher', 'collision', 'noise'], sum: 0, count: 0, defaultModule: 'dispatcher' },
  };

  for (const s of sessions) {
    const moduleId = resolvePracticeModuleId(s.gameType);
    if (!moduleId) continue;
    for (const domain of Object.values(domainMap)) {
      if (domain.modules.includes(moduleId)) {
        domain.sum += s.score;
        domain.count += 1;
      }
    }
  }

  let weakestDomain = 'memory';
  let minAvg = Infinity;

  for (const [key, domain] of Object.entries(domainMap)) {
    const avg = domain.count > 0 ? domain.sum / domain.count : Infinity;
    if (avg < minAvg) {
      minAvg = avg;
      weakestDomain = key;
    }
  }

  return domainMap[weakestDomain].defaultModule;
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

  const sessions = await getDailyTrajectoryRepository().findRecentCompletedSessions(userId, 50);

  const todayStart = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));
  const nextDayStart = new Date(todayStart);
  nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
  const sessionsBeforeTargetDayEnd = sessions.filter((session) => new Date(session.createdAt) < nextDayStart);
  const todaySessions = sessionsBeforeTargetDayEnd.filter((session) => new Date(session.createdAt) >= todayStart);

  const playedToday = new Set(todaySessions
    .map((session) => resolvePracticeModuleId(session.gameType))
    .filter((moduleId): moduleId is string => moduleId !== null));

  const weakModule = findWeakestModule(sessionsBeforeTargetDayEnd);

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

  const lastModule = sessionsBeforeTargetDayEnd.length > 0
    ? resolvePracticeModuleId(sessionsBeforeTargetDayEnd[0].gameType) || 'schulte'
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

  const plan = await getDailyTrajectoryRepository().findPlan(userId, new Date(dateStr));

  if (!plan) return null;

  return plan.items;
}

export async function getOrCreateDailyPlan(userId: string, date?: Date): Promise<DailyPracticeItem[]> {
  const existing = await getDailyPlan(userId, date);
  if (existing) return existing;

  const items = await generateDailyPlan(userId, date);
  const targetDate = date || new Date();
  const dateStr = toISOStringDate(targetDate);

  try {
    await getDailyTrajectoryRepository().createPlan(userId, new Date(dateStr), items);
  } catch (err) {
    logger.error('Failed to persist daily plan', { error: safeError(err), operation: 'create-plan' });
    throw err;
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

  const plan = await getDailyTrajectoryRepository().findPlan(userId, new Date(dateStr));

  if (!plan) return null;

  const items = plan.items;
  if (!items.some((item) => item.id === itemId)) return null;
  const updated = items.map((item) => {
    if (item.id !== itemId) return item;
    return {
      ...item,
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
    };
  });

  try {
    await getDailyTrajectoryRepository().replacePlanItems(plan.id, updated);
  } catch (err) {
    logger.error('Failed to update item status', { error: safeError(err), operation: 'replace-plan-items' });
    throw err;
  }

  return updated;
}

export async function markDailyPlanItemCompleted(
  userId: string,
  gameType: string,
  completedAt = new Date(),
): Promise<boolean> {
  const moduleId = resolvePracticeModuleId(gameType);
  if (!moduleId) return false;

  const dateStr = toISOStringDate(completedAt);
  const plan = await getDailyTrajectoryRepository().findPlan(userId, new Date(dateStr));
  if (!plan) return false;

  const matchingItem = plan.items.find((item) => item.moduleId === moduleId);
  if (!matchingItem || matchingItem.status === 'completed') return false;

  const updated = plan.items.map((item) => item.id === matchingItem.id
    ? { ...item, status: 'completed' as const, completedAt: completedAt.toISOString() }
    : item);
  await getDailyTrajectoryRepository().replacePlanItems(plan.id, updated);
  return true;
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
