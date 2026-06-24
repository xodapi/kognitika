import { z } from 'zod';

export const DailyPracticeItemStatusSchema = z.enum(['planned', 'in_progress', 'completed', 'skipped']);
export type DailyPracticeItemStatus = z.infer<typeof DailyPracticeItemStatusSchema>;

export const DailyPracticeItemSchema = z.object({
  id: z.string().min(1).max(40),
  category: z.enum(['cognitive', 'somatic', 'safety']),
  moduleId: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  reason: z.enum(['weak_area', 'streak_maintenance', 'variety', 'recovery', 'scheduled']),
  status: DailyPracticeItemStatusSchema,
  completedAt: z.string().datetime().optional(),
  xpReward: z.number().int().nonnegative(),
});

export type DailyPracticeItem = z.infer<typeof DailyPracticeItemSchema>;

export const DailyPracticePlanSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(), // YYYY-MM-DD
  items: z.array(DailyPracticeItemSchema),
  createdAt: z.string().datetime(),
});

export type DailyPracticePlan = z.infer<typeof DailyPracticePlanSchema>;

export const DAILY_PRACTICE_MODULE_TITLES: Record<string, string> = {
  schulte: 'Таблицы Шульте',
  stroop: 'Эффект Струпа',
  nback: 'Задача N-назад',
  numerical: 'Числовой анализ',
  logical: 'Логические матрицы',
  typing: 'Скоростная печать',
  spatial: 'Пространство',
  topology: 'Архитектура контекста',
  collision: 'Детектор коллизий',
  dispatcher: 'Асинхронный диспетчер',
  noise: 'Редукция шума',
  scanner: 'Смысловой сканер',
  decryptor: 'Декриптор',
  reality: 'Проверка реальности',
  silence: 'Техника «Тишина»',
  filter: 'Ментальный фильтр',
  objective: 'Объективный фильтр',
  profiling: 'Профайлинг RICE',
  situational: 'Ситуационные задачи',
  dialogue: 'Сложные диалоги',
  reframing: 'Фича, а не баг',
  rejection: 'Иммунитет к отказам',
  storytelling: 'Смысловые связи',
  focus: 'Глубокий фокус',
};

export const CATEGORY_LABELS: Record<string, string> = {
  cognitive: 'Когнитивная',
  somatic: 'Восстановление',
  safety: 'Когнитивная безопасность',
};

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  cognitive: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  somatic: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  safety: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
};
