import type {
  DailyPracticeCategory,
  PracticeReason,
  PracticeRecommendation,
} from '@kognitika/shared-types';
import { submitPracticeRecommended } from './api';

export const MODULE_TITLES: Record<string, string> = {
  schulte: 'Таблицы Шульте',
  stroop: 'Эффект Струпа',
  nback: 'Задача N-назад',
  numerical: 'Числовой анализ',
  logical: 'Логические матрицы',
  situational: 'Ситуационные задачи',
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
  hype: 'Фича или хайп',
  dialogue: 'Сложные диалоги',
  reframing: 'Фича, а не баг',
  rejection: 'Иммунитет к отказам',
  storytelling: 'Смысловые связи',
  focus: 'Глубокий фокус',
};

export interface MobilePracticeRecommendationInput {
  sourceModuleId: string;
  accuracy?: number | null;
}

export interface MobilePracticeRecommendation extends PracticeRecommendation {
  title: string;
  reasonText: string;
  successText: string;
  improvementText: string;
}

export function buildMobilePracticeRecommendation(
  input: MobilePracticeRecommendationInput
): MobilePracticeRecommendation {
  const sourceModuleId = input.sourceModuleId.toLowerCase();
  
  // Детерминированный переход для мобильной версии (от Schulte к Stroop)
  let recommendedModuleId = 'stroop';
  let category: DailyPracticeCategory = 'cognitive';
  let reason: PracticeReason = 'variety';

  const accuracy = input.accuracy ?? 100;
  if (accuracy < 70) {
    reason = 'weak_area';
  } else if (accuracy >= 90) {
    reason = 'streak_maintenance';
  }

  const successText = accuracy >= 90
    ? 'Сильная сессия: вы сохранили отличную концентрацию.'
    : 'Сессия завершена: результат зафиксирован в системе.';

  const improvementText = accuracy < 70
    ? 'Рекомендуем снизить темп и уделить внимание точности ответов.'
    : 'Отличный темп. Попробуйте теперь сменить тип когнитивной нагрузки.';

  const reasonTextByReason: Record<PracticeReason, string> = {
    weak_area: 'Подбираем тренировку под текущую зону роста.',
    streak_maintenance: 'Поддерживаем удачную серию и даём соседнюю нагрузку.',
    variety: 'Меняем тип задачи, чтобы навык переносился шире.',
    recovery: 'Даём восстановительную нагрузку перед следующей сессией.',
  };

  return {
    moduleId: recommendedModuleId,
    category,
    reason,
    title: MODULE_TITLES[recommendedModuleId] || recommendedModuleId,
    reasonText: reasonTextByReason[reason],
    successText,
    improvementText,
  };
}

export async function recordPracticeRecommended(
  recommendation: PracticeRecommendation,
  sourceSessionId: string
) {
  try {
    await submitPracticeRecommended({
      category: recommendation.category,
      moduleId: recommendation.moduleId,
      reason: recommendation.reason,
      sourceSessionId,
    });
  } catch (err) {
    console.warn('Failed to record practice recommended:', err);
  }
}
