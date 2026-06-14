export type DailyPracticeCategory = 'cognitive' | 'somatic' | 'safety';

export type PracticeRecommendationReason =
  | 'weak_area'
  | 'streak_maintenance'
  | 'variety'
  | 'recovery';

export interface PracticeRecommendationInput {
  sourceModuleId: string;
  score?: number | null;
  maxScore?: number | null;
  accuracy?: number | null;
  errors?: number | null;
  durationMs?: number | null;
}

export interface PracticeRecommendation {
  category: DailyPracticeCategory;
  moduleId: string;
  title: string;
  reason: PracticeRecommendationReason;
  reasonText: string;
  successText: string;
  improvementText: string;
}

export interface PracticeRecommendedPayload {
  category: DailyPracticeCategory;
  moduleId: string;
  reason: PracticeRecommendationReason;
  sourceSessionId: string;
}

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
  hype: 'Фактчек или хайп',
  dialogue: 'Сложные диалоги',
  reframing: 'Фича, а не баг',
  rejection: 'Иммунитет к отказам',
  storytelling: 'Смысловые связи',
  focus: 'Глубокий фокус',
};

const GAME_TYPE_TO_MODULE: Record<string, string> = {
  SCHULTE: 'schulte',
  STROOP: 'stroop',
  N_BACK: 'nback',
  NBACK: 'nback',
  NUMERICAL_ANALYSIS: 'numerical',
  LOGICAL_SEQUENCE: 'logical',
  SITUATIONAL_JUDGMENT: 'situational',
  SPEED_TYPING: 'typing',
  TYPING: 'typing',
  SPATIAL_CONCEALMENT: 'spatial',
  SPATIAL: 'spatial',
  TOPOLOGY_MEMORY: 'topology',
  COLLISION_DETECTOR: 'collision',
  ASYNC_DISPATCHER: 'dispatcher',
  NOISE_REDUCTION: 'noise',
  LANGUAGE_SCANNER: 'scanner',
  DECRYPTOR: 'decryptor',
  REALITY_CHECK: 'reality',
  NEURO_SILENCE: 'silence',
  COGNITIVE_TRASH_FILTER: 'filter',
  OBJECTIVE_FILTER: 'objective',
  PROFILING_RICE: 'profiling',
  HYPE_FILTER: 'hype',
  DIALOGUE: 'dialogue',
  SOCIAL_EQ: 'dialogue',
  REFRAMING: 'reframing',
  REJECTION_IMMUNITY: 'rejection',
  STORYTELLING: 'storytelling',
  DEEP_FOCUS: 'focus',
};

const MODULE_CATEGORIES: Record<string, DailyPracticeCategory> = {
  silence: 'somatic',
  scanner: 'safety',
  decryptor: 'safety',
  reality: 'safety',
  filter: 'safety',
  hype: 'safety',
  reframing: 'safety',
  rejection: 'safety',
  storytelling: 'cognitive',
  focus: 'cognitive',
};

const NEXT_MODULE: Record<string, string> = {
  schulte: 'stroop',
  stroop: 'nback',
  nback: 'numerical',
  numerical: 'logical',
  logical: 'spatial',
  spatial: 'topology',
  topology: 'collision',
  collision: 'dispatcher',
  dispatcher: 'noise',
  noise: 'scanner',
  scanner: 'decryptor',
  decryptor: 'reality',
  reality: 'objective',
  objective: 'profiling',
  profiling: 'typing',
  typing: 'schulte',
  situational: 'dialogue',
  dialogue: 'reframing',
  reframing: 'rejection',
  rejection: 'storytelling',
  storytelling: 'focus',
  focus: 'schulte',
  filter: 'scanner',
  hype: 'scanner',
  silence: 'schulte',
};

const WEAK_AREA_MODULE: Record<string, string> = {
  typing: 'stroop',
  spatial: 'nback',
  situational: 'dialogue',
  topology: 'spatial',
  collision: 'scanner',
  dispatcher: 'noise',
  scanner: 'decryptor',
  decryptor: 'reality',
  reality: 'scanner',
  profiling: 'situational',
};

function titleFor(moduleId: string) {
  return MODULE_TITLES[moduleId] || 'Таблицы Шульте';
}

export function categoryForPracticeModule(moduleId: string): DailyPracticeCategory {
  return MODULE_CATEGORIES[moduleId] || 'cognitive';
}

export function normalizePracticeModuleId(value: string | null | undefined) {
  const raw = String(value || '').trim();
  if (!raw) return 'schulte';

  const upper = raw.toUpperCase().replace(/-/g, '_');
  if (GAME_TYPE_TO_MODULE[upper]) return GAME_TYPE_TO_MODULE[upper];

  const lower = raw.toLowerCase().replace(/_/g, '-');
  const compact = lower.replace(/-/g, '');
  if (MODULE_TITLES[lower]) return lower;
  if (MODULE_TITLES[compact]) return compact;

  return 'schulte';
}

function boundedAccuracy(input: PracticeRecommendationInput) {
  if (typeof input.accuracy === 'number' && Number.isFinite(input.accuracy)) {
    return Math.max(0, Math.min(100, Math.round(input.accuracy)));
  }

  if (
    typeof input.score === 'number' &&
    typeof input.maxScore === 'number' &&
    Number.isFinite(input.score) &&
    Number.isFinite(input.maxScore) &&
    input.maxScore > 0
  ) {
    return Math.max(0, Math.min(100, Math.round((input.score / input.maxScore) * 100)));
  }

  if (typeof input.errors === 'number' && Number.isFinite(input.errors)) {
    return Math.max(0, Math.min(100, 100 - Math.round(input.errors) * 8));
  }

  return null;
}

function successText(sourceTitle: string, input: PracticeRecommendationInput, accuracy: number | null) {
  if (accuracy !== null && accuracy >= 90) {
    return `Сильная сессия: в модуле «${sourceTitle}» вы удержали высокий уровень точности.`;
  }

  if (typeof input.score === 'number' && input.score > 0) {
    return `Сессия завершена: результат ${Math.round(input.score)} зафиксирован как новая точка тренировки.`;
  }

  return `Вы довели модуль «${sourceTitle}» до конца. Это уже полезная нагрузка для регулярной практики.`;
}

function improvementText(sourceTitle: string, input: PracticeRecommendationInput, accuracy: number | null) {
  if (accuracy !== null && accuracy < 70) {
    return `Следующий фокус — качество выполнения. В «${sourceTitle}» сейчас важнее снизить ошибки, чем ускоряться.`;
  }

  if (typeof input.errors === 'number' && input.errors > 0) {
    return `Есть несколько ошибок, значит зона роста понятна: спокойнее темп, точнее выбор, меньше импульсивных действий.`;
  }

  return 'Теперь полезно сменить тип нагрузки, чтобы тренировать перенос навыка, а не только повторять знакомый паттерн.';
}

export function buildPracticeRecommendation(input: PracticeRecommendationInput): PracticeRecommendation {
  const sourceModuleId = normalizePracticeModuleId(input.sourceModuleId);
  const sourceTitle = titleFor(sourceModuleId);
  const accuracy = boundedAccuracy(input);

  let moduleId = NEXT_MODULE[sourceModuleId] || 'schulte';
  let reason: PracticeRecommendationReason = 'variety';

  if (sourceModuleId !== 'silence' && accuracy !== null && accuracy < 70) {
    moduleId = WEAK_AREA_MODULE[sourceModuleId] || moduleId;
    reason = 'weak_area';
  } else if (sourceModuleId === 'silence') {
    reason = 'recovery';
  } else if (accuracy !== null && accuracy >= 90) {
    reason = 'streak_maintenance';
  }

  const category = categoryForPracticeModule(moduleId);
  if (category === 'somatic') {
    reason = 'recovery';
  }

  const reasonTextByReason: Record<PracticeRecommendationReason, string> = {
    weak_area: 'Подбираем тренировку под текущую зону роста.',
    streak_maintenance: 'Поддерживаем удачную серию и даём соседнюю нагрузку.',
    variety: 'Меняем тип задачи, чтобы навык переносился шире.',
    recovery: 'Даём восстановительную нагрузку перед следующей когнитивной сессией.',
  };

  return {
    category,
    moduleId,
    title: titleFor(moduleId),
    reason,
    reasonText: reasonTextByReason[reason],
    successText: successText(sourceTitle, input, accuracy),
    improvementText: improvementText(sourceTitle, input, accuracy),
  };
}
