export interface PraiseMetricHighlight {
  metric: 'accuracy' | 'reaction' | 'fatigue' | 'engagement';
  label: string;
  value: number;
  delta?: number;
  direction: 'up' | 'down' | 'stable';
  isPositive: boolean;
}

export interface PraiseInput {
  currentAccuracy: number;
  currentReactionMs: number;
  currentFatigueIndex: number;
  currentEngagementIndex: number;
  historicalAvgAccuracy?: number | null;
  historicalAvgReactionMs?: number | null;
}

export interface PraiseOutput {
  headline: string;
  details: string[];
  metricHighlights: PraiseMetricHighlight[];
}

const ACCURACY_THRESHOLD = 0.05;
const REACTION_THRESHOLD_MS = 30;
const FATIGUE_THRESHOLD = 0.15;
const ENGAGEMENT_THRESHOLD = 0.1;

function fmtPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function fmtMs(v: number): string {
  return `${Math.round(v)} мс`;
}

function deltaPct(current: number, historical: number): number {
  if (historical === 0) return 0;
  return Math.round(((current - historical) / historical) * 100);
}

export function buildPraise(input: PraiseInput): PraiseOutput {
  const highlights: PraiseMetricHighlight[] = [];
  const details: string[] = [];

  if (input.historicalAvgAccuracy != null) {
    const accDelta = input.currentAccuracy - input.historicalAvgAccuracy;
    const accDeltaPct = deltaPct(input.currentAccuracy, input.historicalAvgAccuracy);
    const accDirection = accDelta > ACCURACY_THRESHOLD ? 'up' : accDelta < -ACCURACY_THRESHOLD ? 'down' : 'stable';
    highlights.push({
      metric: 'accuracy',
      label: 'Точность',
      value: Math.round(input.currentAccuracy * 100),
      delta: accDeltaPct,
      direction: accDirection,
      isPositive: accDirection === 'up',
    });
    if (accDirection === 'up') {
      details.push(`Точность выросла на ${Math.abs(accDeltaPct)}% по сравнению со вашим средним уровнем (${fmtPct(input.historicalAvgAccuracy)} → ${fmtPct(input.currentAccuracy)}).`);
    } else if (accDirection === 'down') {
      details.push(`Точность снизилась на ${Math.abs(accDeltaPct)}%. Это естественное колебание — мозг консолидирует навык.`);
    } else {
      details.push(`Точность стабильна на уровне ${fmtPct(input.currentAccuracy)}.`);
    }
  } else {
    highlights.push({
      metric: 'accuracy',
      label: 'Точность',
      value: Math.round(input.currentAccuracy * 100),
      direction: 'stable',
      isPositive: input.currentAccuracy >= 0.8,
    });
  }

  if (input.historicalAvgReactionMs != null) {
    const reactDelta = input.historicalAvgReactionMs - input.currentReactionMs;
    const reactDirection = reactDelta > REACTION_THRESHOLD_MS ? 'up' : reactDelta < -REACTION_THRESHOLD_MS ? 'down' : 'stable';
    highlights.push({
      metric: 'reaction',
      label: 'Скорость реакции',
      value: Math.round(input.currentReactionMs),
      delta: Math.round(reactDelta),
      direction: reactDirection,
      isPositive: reactDirection === 'up',
    });
    if (reactDirection === 'up') {
      details.push(`Скорость реакции улучшилась на ${Math.abs(Math.round(reactDelta))} мс.`);
    } else if (reactDirection === 'down') {
      details.push(`Скорость реакции замедлилась на ${Math.abs(Math.round(reactDelta))} мс. Вы удерживали стабильный темп.`);
    } else {
      details.push(`Скорость реакции стабильна — ${fmtMs(input.currentReactionMs)}.`);
    }
  } else {
    highlights.push({
      metric: 'reaction',
      label: 'Скорость реакции',
      value: Math.round(input.currentReactionMs),
      direction: 'stable',
      isPositive: input.currentReactionMs < 500,
    });
  }

  const fatigueDirection = input.currentFatigueIndex < -FATIGUE_THRESHOLD ? 'down' : input.currentFatigueIndex > FATIGUE_THRESHOLD ? 'up' : 'stable';
  highlights.push({
    metric: 'fatigue',
    label: 'Усталость',
    value: Math.round(input.currentFatigueIndex * 100),
    direction: fatigueDirection,
    isPositive: fatigueDirection === 'down' || fatigueDirection === 'stable',
  });
  if (fatigueDirection === 'down') {
    details.push('Усталость снизилась — вы держались дольше и стабильнее.');
  } else if (fatigueDirection === 'up') {
    details.push('Уровень усталости повышен. Сделайте восстановительную практику.');
  }

  const engagementDirection = input.currentEngagementIndex > 0.7 + ENGAGEMENT_THRESHOLD ? 'up' : input.currentEngagementIndex < 0.7 - ENGAGEMENT_THRESHOLD ? 'down' : 'stable';
  highlights.push({
    metric: 'engagement',
    label: 'Вовлечённость',
    value: Math.round(input.currentEngagementIndex * 100),
    direction: engagementDirection,
    isPositive: engagementDirection === 'up',
  });
  if (engagementDirection === 'up') {
    details.push('Вы были максимально вовлечены в процесс — отличная концентрация.');
  }

  const headline = generateHeadline(input, highlights);

  return { headline, details, metricHighlights: highlights };
}

function generateHeadline(input: PraiseInput, highlights: PraiseMetricHighlight[]): string {
  const accuracy = highlights.find((h) => h.metric === 'accuracy');
  const reaction = highlights.find((h) => h.metric === 'reaction');
  const fatigue = highlights.find((h) => h.metric === 'fatigue');

  if (accuracy?.isPositive && reaction?.isPositive) {
    return 'Превосходная сессия! Точность и скорость на высоте.';
  }

  if (accuracy?.isPositive) {
    return 'Отличная точность! Ваш фокус в оптимальном состоянии.';
  }

  if (reaction?.isPositive) {
    return 'Отличная скорость реакции! Нейромоторная система работает чётко.';
  }

  if (fatigue?.isPositive && accuracy?.value && accuracy.value >= 75) {
    return 'Стабильная сессия без признаков усталости. Хорошая выносливость.';
  }

  if (accuracy?.direction === 'down' && fatigue?.direction === 'up') {
    return 'Когнитивная нагрузка далась знать. Отдых — часть тренировочного процесса.';
  }

  return 'Тренировка завершена. Каждая сессия приближает вас к цели.';
}
