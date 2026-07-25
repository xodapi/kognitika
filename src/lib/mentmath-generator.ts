/**
 * Deterministic generator for Mental Math trainer (Задание №7).
 * All operands and final answers stay within -200..200; division always produces whole numbers.
 */

class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
}

export type MathLevel = 1 | 2 | 3 | 4;

export interface MathQuestion {
  equation: string;
  answer: number;
  display: string;
}

export interface MathLegend {
  [symbol: string]: string;
}

export interface GeneratedMathSet {
  legend: MathLegend;
  questions: MathQuestion[];
}

export const MENTAL_MATH_PRESETS: ReadonlyArray<{
  level: MathLevel;
  title: string;
  description: string;
  hasLegend: boolean;
}> = [
  { level: 1, title: 'Быстрые + / -', description: 'Одно действие сложения или вычитания без легенды.', hasLegend: false },
  { level: 2, title: 'Целые × / ÷', description: 'Умножение и деление с целым результатом.', hasLegend: false },
  { level: 3, title: 'Два символа', description: 'Два действия + / - с легендой символов.', hasLegend: true },
  { level: 4, title: 'Четыре символа', description: 'Четыре действия + / - / × / ÷ с легендой.', hasLegend: true },
] as const;

const OPERATORS_LEVEL1 = ['+', '-'] as const;
const OPERATORS_LEVEL2 = ['*', '/'] as const;
const OPERATORS_LEVEL3 = ['+', '-'] as const;
const OPERATORS_LEVEL4 = ['+', '-', '*', '/'] as const;
const SYMBOL_POOL = ['@', '#', '$', '%', '&', '!'] as const;
const MIN_OPERAND = 1;
const MAX_OPERAND = 99;
const MIN_RESULT = -200;
const MAX_ANSWER = 200;

function applyOp(a: number, b: number, op: string): number | null {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 && a % b === 0 ? a / b : null;
    default: return null;
  }
}

function generateQuestion(rng: SeededRandom, level: MathLevel, legend: MathLegend | null): MathQuestion {
  const ops = level === 1
    ? OPERATORS_LEVEL1
    : level === 2
      ? OPERATORS_LEVEL2
      : level === 3
        ? OPERATORS_LEVEL3
        : OPERATORS_LEVEL4;
  const operatorCount = level <= 2 ? 1 : 2;
  for (let attempt = 0; attempt < 50; attempt++) {
    const a = rng.int(MIN_OPERAND, MAX_OPERAND);
    const b = rng.int(MIN_OPERAND, level === 2 ? 20 : MAX_OPERAND);
    const op1 = rng.pick(ops as unknown as string[]);

    // For level 1, only + and - (left-to-right is safe)
    const step1 = applyOp(a, b, op1);
    if (step1 === null) continue;
    if (step1 < MIN_RESULT || step1 > MAX_ANSWER) continue;
    let result = step1;
    const expressionParts = [String(a), op1, String(b)];
    if (operatorCount === 2) {
      const c = rng.int(MIN_OPERAND, level === 4 ? 12 : MAX_OPERAND);
      const op2 = rng.pick(ops as unknown as string[]);
      result = applyOp(step1, c, op2) ?? Number.NaN;
      expressionParts.push(op2, String(c));
    }
    if (!Number.isInteger(result) || result < MIN_RESULT || result > MAX_ANSWER) continue;

    const displayParts = expressionParts.map((part) => (
      legend && (part === op1 || part === expressionParts[3])
        ? Object.entries(legend).find(([, v]) => v === part)?.[0] ?? part
        : part
    ));
    const equation = displayParts.join(' ');
    const display = `${equation} = ?`;

    return { equation, answer: result, display };
  }

  // Deterministic fallback that always satisfies constraints
  const a = level === 2 ? 10 : 50;
  const b = level === 2 ? 2 : 20;
  const firstOperator = level === 2 ? '*' : '+';
  const secondOperator = '+';
  const values = level >= 3
    ? [a, firstOperator, b, secondOperator, 1]
    : [a, firstOperator, b];
  let answer = firstOperator === '*' ? a * b : a + b;
  if (level >= 3) answer += 1;
  const displayValues = values.map((value) => (
    typeof value === 'string' && legend
      ? Object.entries(legend).find(([, operator]) => operator === value)?.[0] ?? value
      : value
  ));
  const equation = displayValues.join(' ');
  return {
    equation,
    answer,
    display: `${equation} = ?`,
  };
}

function generateLegend(rng: SeededRandom, operators: readonly string[]): MathLegend {
  const shuffled = [...SYMBOL_POOL].sort(() => rng.next() - 0.5);
  const legend: MathLegend = {};
  for (let i = 0; i < operators.length; i++) {
    legend[shuffled[i]] = operators[i];
  }
  return legend;
}

export function generateMathSet(
  count: number = 48,
  level: MathLevel = 1,
  seed?: number,
): GeneratedMathSet {
  const safeCount = Number.isFinite(count) ? count : 48;
  const normalizedCount = Math.max(1, Math.min(48, Math.round(safeCount)));
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 1000000));
  const legendOperators = level === 3 ? OPERATORS_LEVEL3 : OPERATORS_LEVEL4;
  const legend = level >= 3
    ? generateLegend(rng, legendOperators)
    : {};
  const questions: MathQuestion[] = [];
  const equations = new Set<string>();

  for (
    let attempt = 0;
    questions.length < normalizedCount && attempt < normalizedCount * 20;
    attempt++
  ) {
    const question = generateQuestion(rng, level, level >= 3 ? legend : null);
    if (equations.has(question.equation)) continue;
    equations.add(question.equation);
    questions.push(question);
  }

  let fallbackIndex = 0;
  while (questions.length < normalizedCount) {
    const left = 100 + fallbackIndex;
    fallbackIndex += 1;
    const firstOperator = level === 2 ? '*' : '+';
    const secondOperator = '+';
    const values = level >= 3
      ? [left, firstOperator, 1, secondOperator, 1]
      : [left, firstOperator, 1];
    const displayValues = values.map((value) => (
      typeof value === 'string' && level >= 3
        ? Object.entries(legend).find(([, operator]) => operator === value)?.[0] ?? value
        : value
    ));
    const equation = displayValues.join(' ');
    if (equations.has(equation)) continue;
    equations.add(equation);
    questions.push({
      equation,
      answer: level === 2 ? left : left + (level >= 3 ? 2 : 1),
      display: `${equation} = ?`,
    });
  }

  return { legend, questions };
}

export function evaluateAnswer(question: MathQuestion, userAnswer: number): boolean {
  return userAnswer === question.answer;
}

export function computeMentalMathScore(timeMs: number, accuracy: number, errors: number): number {
  const safeTimeMs = Math.max(100, Number.isFinite(timeMs) ? timeMs : 100);
  const speedScore = Math.min(1000, Math.max(10, Math.floor(100000 / safeTimeMs)));
  const accuracyMultiplier = Math.min(1, Math.max(0.2, accuracy / 100));
  const errorPenalty = Math.min(100, Math.max(0, errors)) * 5;
  return Math.min(1000, Math.max(10, Math.round(speedScore * accuracyMultiplier * 1.03 - errorPenalty)));
}
