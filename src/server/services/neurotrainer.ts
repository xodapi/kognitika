import { generateMathSet, type MathLevel } from '../../lib/mentmath-generator.ts';
import {
  AnalyzeTrainingRequestSchema,
  GeneratedMentalMathSetSchema,
  NeurotrainerAnalysisSchema,
  PrivacySafeHistoryEntrySchema,
  type AnalyzeTrainingRequest,
  type GeneratedMentalMathSet,
  type NeurotrainerAnalysis,
  type PrivacySafeHistoryEntry,
} from '../schemas/neurotrainer.ts';
import {
  createConfiguredLlmProvider,
  type LlmJsonProvider,
} from './llm-provider.ts';

export type NeurotrainerSource = 'llm' | 'fallback';

function applyOperator(left: number, right: number, operator: string): number | null {
  if (operator === '+') return left + right;
  if (operator === '-') return left - right;
  if (operator === '*') return left * right;
  if (operator === '/') {
    return right !== 0 && left % right === 0 ? left / right : null;
  }
  return null;
}

function evaluateEquation(equation: string, legend: Record<string, string>) {
  const tokens = equation.trim().split(/\s+/);
  if (tokens.length !== 3 && tokens.length !== 5) return null;

  let result = Number(tokens[0]);
  if (!Number.isInteger(result) || result < 1 || result > 200) return null;

  for (let index = 1; index < tokens.length; index += 2) {
    const operator = legend[tokens[index]] || tokens[index];
    const operand = Number(tokens[index + 1]);
    if (!Number.isInteger(operand) || operand < 1 || operand > 200) return null;

    const next = applyOperator(result, operand, operator);
    if (next === null || !Number.isInteger(next) || next < 1 || next > 200) return null;
    result = next;
  }

  return result;
}

export function validateGeneratedMentalMathSet(
  value: unknown,
  level: MathLevel,
  count: number,
): GeneratedMentalMathSet | null {
  const parsed = GeneratedMentalMathSetSchema.safeParse(value);
  if (!parsed.success || parsed.data.questions.length !== count) return null;

  const legend = parsed.data.legend;
  const legendValues = Object.values(legend).sort();
  if (level === 1 && Object.keys(legend).length !== 0) return null;
  if (
    level === 2
    && (
      Object.keys(legend).length !== 4
      || legendValues.join(',') !== ['*', '+', '-', '/'].sort().join(',')
    )
  ) {
    return null;
  }

  const equations = new Set<string>();
  for (const question of parsed.data.questions) {
    if (equations.has(question.equation)) return null;
    equations.add(question.equation);

    const evaluated = evaluateEquation(question.equation, legend);
    if (evaluated === null || evaluated !== question.answer) return null;
    if (question.display !== `${question.equation} = ?`) return null;
  }

  return parsed.data;
}

function mentalMathPrompt(level: MathLevel, count: number) {
  return JSON.stringify({
    task: level === 1 ? 'generate_math_level_1' : 'generate_math_level_2',
    level,
    count,
    constraints: [
      'Return one JSON object with legend and questions only.',
      'Every operand, intermediate result, and final answer must be an integer from 1 to 200.',
      'Evaluate operations strictly from left to right.',
      'Every division must have no remainder.',
      'Equations must be unique within this set.',
      'Use spaces between every number and operator.',
      'display must equal equation followed by " = ?".',
      level === 1
        ? 'Use only + and - operators and return an empty legend.'
        : 'Replace +, -, *, / with four unique symbols and return the complete symbol legend.',
    ],
    response_shape: {
      legend: { symbol: 'operator' },
      questions: [{ equation: 'string', answer: 1, display: 'string' }],
    },
  });
}

export async function generateMentalMathTraining(input: {
  level: MathLevel;
  count: number;
  provider?: LlmJsonProvider | null;
}): Promise<{ set: GeneratedMentalMathSet; source: NeurotrainerSource }> {
  const fallback = () => ({
    set: GeneratedMentalMathSetSchema.parse(generateMathSet(input.count, input.level)),
    source: 'fallback' as const,
  });
  let provider: LlmJsonProvider | null;
  try {
    provider = input.provider === undefined
      ? createConfiguredLlmProvider()
      : input.provider;
  } catch {
    return fallback();
  }
  if (!provider) return fallback();

  try {
    const raw = await provider.generateJson({
      system: 'You are a calm neurotrainer. Generate exercises only, never diagnoses or personal inferences.',
      user: mentalMathPrompt(input.level, input.count),
      temperature: 0.6,
    });
    const validated = validateGeneratedMentalMathSet(raw, input.level, input.count);
    return validated ? { set: validated, source: 'llm' } : fallback();
  } catch {
    return fallback();
  }
}

function roundedAverage(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function fallbackAnalysis(
  current: AnalyzeTrainingRequest,
  history: PrivacySafeHistoryEntry[],
): NeurotrainerAnalysis {
  const accuracy = current.totalQuestions && current.correctAnswers !== undefined
    ? Math.round((current.correctAnswers / current.totalQuestions) * 100)
    : Math.max(0, 100 - current.errors * 5);
  const averageTime = roundedAverage(history.map((entry) => entry.timeMs));
  const faster = averageTime !== null && current.timeMs < averageTime;
  const slower = averageTime !== null && current.timeMs > averageTime;

  let feedback = `Тренировка завершена с точностью ${accuracy}%.`;
  if (faster && current.errors <= 2) {
    feedback += ' Темп улучшился без заметной потери точности.';
  } else if (faster) {
    feedback += ' Темп вырос, но точность стоит поставить выше скорости.';
  } else if (slower && current.errors <= 2) {
    feedback += ' Точность стабильна; скорость можно увеличивать постепенно.';
  } else if (history.length > 0) {
    feedback += ' Колебания между попытками нормальны, ориентируйтесь на устойчивый прогресс.';
  } else {
    feedback += ' Это первая опорная точка для сравнения следующих попыток.';
  }

  return {
    feedback,
    recommendations: [
      current.errors > 2
        ? 'В следующей попытке снизьте темп и удерживайте точность.'
        : 'Повторите тренировку после короткого перерыва и сравните стабильность.',
      'Остановитесь при усталости или напряжении глаз.',
    ],
  };
}

export async function analyzeNeurotraining(input: {
  current: AnalyzeTrainingRequest;
  history: PrivacySafeHistoryEntry[];
  provider?: LlmJsonProvider | null;
}): Promise<{ analysis: NeurotrainerAnalysis; source: NeurotrainerSource }> {
  const fallback = () => ({
    analysis: fallbackAnalysis(input.current, input.history),
    source: 'fallback' as const,
  });
  let provider: LlmJsonProvider | null;
  try {
    provider = input.provider === undefined
      ? createConfiguredLlmProvider()
      : input.provider;
  } catch {
    return fallback();
  }
  if (!provider) return fallback();

  try {
    const safeCurrent = AnalyzeTrainingRequestSchema.parse(input.current);
    const safeHistory = input.history
      .slice(0, 10)
      .flatMap((entry) => {
        const parsed = PrivacySafeHistoryEntrySchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      });
    const raw = await provider.generateJson({
      system: [
        'You are a calm, encouraging neurotrainer.',
        'Analyze only training metrics.',
        'Do not infer identity, diagnosis, IQ, medical condition, or personal traits.',
        'Return concise JSON only.',
      ].join(' '),
      user: JSON.stringify({
        task: 'analyze_results',
        current: safeCurrent,
        history: safeHistory,
        response_shape: {
          feedback: 'string, maximum 500 characters',
          recommendations: ['one to three short strings'],
        },
      }),
      temperature: 0.3,
    });
    const parsed = NeurotrainerAnalysisSchema.safeParse(raw);
    return parsed.success
      ? { analysis: parsed.data, source: 'llm' }
      : fallback();
  } catch {
    return fallback();
  }
}
