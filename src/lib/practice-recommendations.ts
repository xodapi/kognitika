import { routeForRecommendedGame } from './routes';

export type DailyPracticeCategory = 'cognitive' | 'somatic' | 'safety';

export type PracticeRecommendationReason =
  | 'weak_area'
  | 'streak_maintenance'
  | 'variety'
  | 'recovery';

export interface PracticeRecommendedPayload {
  category: DailyPracticeCategory;
  moduleId: string;
  reason: PracticeRecommendationReason;
  sourceSessionId: string;
}

export interface PracticeRecommendation {
  category: DailyPracticeCategory;
  moduleId: string;
  moduleTitle: string;
  reason: PracticeRecommendationReason;
  route: string;
}

export interface CompletionNarrative {
  didWell: string;
  improve: string;
  recommendationReason: string;
}

export const PRACTICE_MODULE_TITLES: Record<string, string> = {
  schulte: 'Таблицы Шульте',
  stroop: 'Эффект Струпа',
  nback: 'N-назад',
  numerical: 'Числовой анализ',
  logical: 'Логические матрицы',
  situational: 'Ситуационные задачи',
  typing: 'Скоростная печать',
  spatial: 'Пространственное удержание',
  topology: 'Архитектура контекста',
  collision: 'Детектор коллизий',
  dispatcher: 'Асинхронный диспетчер',
  noise: 'Редукция шума',
  scanner: 'Смысловой сканер',
  decryptor: 'Декриптор',
  reality: 'Проверка реальности',
  objective: 'Объективный фильтр',
  profiling: 'Профайлинг RICE',
  anomaly: 'Детектор аномалий',
  dialogue: 'Симулятор сложных диалогов',
  silence: 'Нейрорегуляция: Тишина',
  filter: 'Когнитивный фильтр',
  hype: 'Фактчек или Хайп',
  reframing: 'Фича, а не баг',
  rejection: 'Иммунитет к отказам',
  storytelling: 'Смысловые связи',
  focus: 'Глубокий фокус',
};

export const PRACTICE_GAME_TYPE_TITLES: Record<string, string> = {
  SCHULTE: PRACTICE_MODULE_TITLES.schulte,
  SCHULTE_GORBOV: PRACTICE_MODULE_TITLES.schulte,
  NUMERICAL_ANALYSIS: PRACTICE_MODULE_TITLES.numerical,
  LOGICAL_SEQUENCE: PRACTICE_MODULE_TITLES.logical,
  SITUATIONAL_JUDGMENT: PRACTICE_MODULE_TITLES.situational,
  STROOP: PRACTICE_MODULE_TITLES.stroop,
  N_BACK: PRACTICE_MODULE_TITLES.nback,
  TYPING: PRACTICE_MODULE_TITLES.typing,
  SPEED_TYPING: PRACTICE_MODULE_TITLES.typing,
  SPATIAL_CONCEALMENT: PRACTICE_MODULE_TITLES.spatial,
  OBJECTIVE_FILTER: PRACTICE_MODULE_TITLES.objective,
  PROFILING_RICE: PRACTICE_MODULE_TITLES.profiling,
  ANOMALY_DETECTOR: PRACTICE_MODULE_TITLES.anomaly,
  DIALOGUE_2_1: PRACTICE_MODULE_TITLES.dialogue,
  SOCIAL_EQ: PRACTICE_MODULE_TITLES.dialogue,
  TOPOLOGY_MEMORY: PRACTICE_MODULE_TITLES.topology,
  COLLISION_DETECTOR: PRACTICE_MODULE_TITLES.collision,
  ASYNC_DISPATCHER: PRACTICE_MODULE_TITLES.dispatcher,
  NOISE_REDUCTION: PRACTICE_MODULE_TITLES.noise,
  LANGUAGE_SCANNER: PRACTICE_MODULE_TITLES.scanner,
  DECRYPTOR: PRACTICE_MODULE_TITLES.decryptor,
  REALITY_CHECK: PRACTICE_MODULE_TITLES.reality,
  NEURO_SILENCE: PRACTICE_MODULE_TITLES.silence,
  COGNITIVE_FILTER: PRACTICE_MODULE_TITLES.filter,
  HYPE_FILTER: PRACTICE_MODULE_TITLES.hype,
  REFRAMING: PRACTICE_MODULE_TITLES.reframing,
  REJECTION_IMMUNITY: PRACTICE_MODULE_TITLES.rejection,
  STORYTELLING: PRACTICE_MODULE_TITLES.storytelling,
  DEEP_FOCUS: PRACTICE_MODULE_TITLES.focus,
};

const FALLBACK_RECOMMENDATIONS: Record<string, Omit<PracticeRecommendation, 'route'>> = {
  SCHULTE: { category: 'cognitive', moduleId: 'stroop', moduleTitle: PRACTICE_MODULE_TITLES.stroop, reason: 'variety' },
  SCHULTE_GORBOV: { category: 'cognitive', moduleId: 'nback', moduleTitle: PRACTICE_MODULE_TITLES.nback, reason: 'variety' },
  NUMERICAL_ANALYSIS: { category: 'cognitive', moduleId: 'logical', moduleTitle: PRACTICE_MODULE_TITLES.logical, reason: 'weak_area' },
  LOGICAL_SEQUENCE: { category: 'cognitive', moduleId: 'nback', moduleTitle: PRACTICE_MODULE_TITLES.nback, reason: 'variety' },
  SITUATIONAL_JUDGMENT: { category: 'cognitive', moduleId: 'dialogue', moduleTitle: PRACTICE_MODULE_TITLES.dialogue, reason: 'weak_area' },
  STROOP: { category: 'cognitive', moduleId: 'noise', moduleTitle: PRACTICE_MODULE_TITLES.noise, reason: 'weak_area' },
  N_BACK: { category: 'cognitive', moduleId: 'schulte', moduleTitle: PRACTICE_MODULE_TITLES.schulte, reason: 'streak_maintenance' },
  TYPING: { category: 'cognitive', moduleId: 'scanner', moduleTitle: PRACTICE_MODULE_TITLES.scanner, reason: 'variety' },
  SPATIAL_CONCEALMENT: { category: 'cognitive', moduleId: 'topology', moduleTitle: PRACTICE_MODULE_TITLES.topology, reason: 'variety' },
  OBJECTIVE_FILTER: { category: 'cognitive', moduleId: 'reality', moduleTitle: PRACTICE_MODULE_TITLES.reality, reason: 'weak_area' },
  PROFILING_RICE: { category: 'cognitive', moduleId: 'dialogue', moduleTitle: PRACTICE_MODULE_TITLES.dialogue, reason: 'weak_area' },
  ANOMALY_DETECTOR: { category: 'cognitive', moduleId: 'dispatcher', moduleTitle: PRACTICE_MODULE_TITLES.dispatcher, reason: 'weak_area' },
  DIALOGUE_2_1: { category: 'cognitive', moduleId: 'reframing', moduleTitle: PRACTICE_MODULE_TITLES.reframing, reason: 'weak_area' },
  SOCIAL_EQ: { category: 'cognitive', moduleId: 'rejection', moduleTitle: PRACTICE_MODULE_TITLES.rejection, reason: 'variety' },
  TOPOLOGY_MEMORY: { category: 'cognitive', moduleId: 'collision', moduleTitle: PRACTICE_MODULE_TITLES.collision, reason: 'variety' },
  COLLISION_DETECTOR: { category: 'cognitive', moduleId: 'objective', moduleTitle: PRACTICE_MODULE_TITLES.objective, reason: 'weak_area' },
  ASYNC_DISPATCHER: { category: 'cognitive', moduleId: 'anomaly', moduleTitle: PRACTICE_MODULE_TITLES.anomaly, reason: 'variety' },
  NOISE_REDUCTION: { category: 'cognitive', moduleId: 'stroop', moduleTitle: PRACTICE_MODULE_TITLES.stroop, reason: 'recovery' },
  LANGUAGE_SCANNER: { category: 'cognitive', moduleId: 'decryptor', moduleTitle: PRACTICE_MODULE_TITLES.decryptor, reason: 'variety' },
  DECRYPTOR: { category: 'cognitive', moduleId: 'reality', moduleTitle: PRACTICE_MODULE_TITLES.reality, reason: 'weak_area' },
  REALITY_CHECK: { category: 'cognitive', moduleId: 'objective', moduleTitle: PRACTICE_MODULE_TITLES.objective, reason: 'streak_maintenance' },
  NEURO_SILENCE: { category: 'somatic', moduleId: 'focus', moduleTitle: PRACTICE_MODULE_TITLES.focus, reason: 'recovery' },
  COGNITIVE_FILTER: { category: 'cognitive', moduleId: 'hype', moduleTitle: PRACTICE_MODULE_TITLES.hype, reason: 'variety' },
  HYPE_FILTER: { category: 'cognitive', moduleId: 'reality', moduleTitle: PRACTICE_MODULE_TITLES.reality, reason: 'weak_area' },
  REFRAMING: { category: 'cognitive', moduleId: 'storytelling', moduleTitle: PRACTICE_MODULE_TITLES.storytelling, reason: 'variety' },
  REJECTION_IMMUNITY: { category: 'safety', moduleId: 'dialogue', moduleTitle: PRACTICE_MODULE_TITLES.dialogue, reason: 'weak_area' },
  STORYTELLING: { category: 'cognitive', moduleId: 'reframing', moduleTitle: PRACTICE_MODULE_TITLES.reframing, reason: 'variety' },
  DEEP_FOCUS: { category: 'somatic', moduleId: 'silence', moduleTitle: PRACTICE_MODULE_TITLES.silence, reason: 'recovery' },
};

export function normalizeGameType(gameType: string) {
  return gameType.trim().toUpperCase().replace(/[-\s]+/g, '_');
}

export function getPracticeModuleTitle(moduleId: string) {
  return PRACTICE_MODULE_TITLES[moduleId] || moduleId;
}

export function getPracticeGameTitle(gameType: string) {
  const normalized = normalizeGameType(gameType);
  return PRACTICE_GAME_TYPE_TITLES[normalized] || getPracticeModuleTitle(gameType.toLowerCase()) || gameType;
}

export function getPracticeRecommendation(
  gameType: string,
  input: { recommendedGame?: string | null; recommendedGameTitle?: string | null; errors?: number; trend?: 'up' | 'down' | 'stable' | null } = {},
): PracticeRecommendation {
  const fallback = FALLBACK_RECOMMENDATIONS[normalizeGameType(gameType)] || FALLBACK_RECOMMENDATIONS.SCHULTE;
  const moduleId = String(input.recommendedGame || fallback.moduleId).trim().toLowerCase();
  const reason = input.errors && input.errors > 0
    ? 'weak_area'
    : input.trend === 'down'
      ? 'recovery'
      : fallback.reason;

  return {
    category: fallback.category,
    moduleId,
    moduleTitle: input.recommendedGameTitle || getPracticeModuleTitle(moduleId),
    reason,
    route: routeForRecommendedGame(moduleId),
  };
}

export function buildCompletionNarrative(input: {
  gameType: string;
  score: number;
  errors: number;
  percentile?: number | null;
  verdict?: string | null;
  recommendation: PracticeRecommendation;
}): CompletionNarrative {
  const gameTitle = getPracticeGameTitle(input.gameType);
  const didWell = input.percentile && input.percentile >= 70
    ? `Вы удержали результат выше среднего уровня: лучше ${input.percentile}% игроков.`
    : input.errors === 0
      ? 'Вы прошли тренировку без зафиксированных ошибок. Это хорошая база для усложнения.'
      : `Вы довели ${gameTitle} до конца и сохранили рабочий темп.`;

  const improve = input.errors > 0
    ? `Зона роста: снизить количество ошибок (${input.errors}) и удерживать качество ответа под нагрузкой.`
    : input.verdict || 'Следующий шаг — закрепить навык в соседнем когнитивном контексте.';

  const reasonText: Record<PracticeRecommendationReason, string> = {
    weak_area: 'выравнивает слабую зону результата',
    streak_maintenance: 'поддерживает ежедневную траекторию без перегруза',
    variety: 'добавляет вариативность и перенос навыка',
    recovery: 'помогает восстановить контроль и снизить когнитивный шум',
  };

  return {
    didWell,
    improve,
    recommendationReason: `${input.recommendation.moduleTitle}: ${reasonText[input.recommendation.reason]}.`,
  };
}

export function createClientSourceSessionId(input: {
  gameType: string;
  score: number;
  timeMs: number;
}) {
  const source = `${normalizeGameType(input.gameType)}:${input.score}:${Math.max(0, Math.round(input.timeMs))}`;
  let hash = 0;
  for (const char of source) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return `client-session-${Math.abs(hash).toString(36)}`;
}
