/**
 * Deterministic generator for Mental Math trainer (Задание №7).
 * All answers are positive integers 1-200; division always produces whole numbers.
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

export type MathLevel = 1 | 2;

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

const OPERATORS_LEVEL1 = ['+', '-', '+'] as const;
const OPERATORS_LEVEL2 = ['+', '-', '*', '/'] as const;
const SYMBOL_POOL = ['@', '#', '$', '%', '&', '!'] as const;
const MIN_OPERAND = 2;
const MAX_OPERAND = 99;
const MIN_ANSWER = 1;
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
  const ops = level === 1 ? OPERATORS_LEVEL1 : OPERATORS_LEVEL2;
  for (let attempt = 0; attempt < 50; attempt++) {
    const a = rng.int(MIN_OPERAND, MAX_OPERAND);
    const b = rng.int(MIN_OPERAND, level === 2 ? 20 : MAX_OPERAND);
    const c = rng.int(MIN_OPERAND, level === 2 ? 12 : MAX_OPERAND);
    const op1 = rng.pick(ops as unknown as string[]);
    const op2 = rng.pick(ops as unknown as string[]);

    // For level 1, only + and - (left-to-right is safe)
    // For level 2, keep left-to-right evaluation (no precedence) to match ТЗ JSON schema
    const step1 = applyOp(a, b, op1);
    if (step1 === null) continue;
    const result = applyOp(step1, c, op2);
    if (result === null || result < MIN_ANSWER || result > MAX_ANSWER) continue;

    const realOp1 = legend ? Object.entries(legend).find(([, v]) => v === op1)?.[0] ?? op1 : op1;
    const realOp2 = legend ? Object.entries(legend).find(([, v]) => v === op2)?.[0] ?? op2 : op2;
    const equation = `${a} ${realOp1} ${b} ${realOp2} ${c}`;
    const display = `${equation} = ?`;

    return { equation, answer: result, display };
  }

  // Deterministic fallback that always satisfies constraints
  const a = rng.int(10, 50);
  const b = rng.int(1, 20);
  const answer = a + b;
  return { equation: `${a} + ${b}`, answer, display: `${a} + ${b} = ?` };
}

function generateLegend(rng: SeededRandom): MathLegend {
  const shuffled = [...SYMBOL_POOL].sort(() => rng.next() - 0.5);
  const ops = ['+', '-', '*', '/'];
  const legend: MathLegend = {};
  for (let i = 0; i < ops.length; i++) {
    legend[shuffled[i]] = ops[i];
  }
  return legend;
}

export function generateMathSet(
  count: number = 20,
  level: MathLevel = 1,
  seed?: number,
): GeneratedMathSet {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 1000000));
  const legend = level === 2 ? generateLegend(rng) : {};
  const questions: MathQuestion[] = [];

  for (let i = 0; i < count; i++) {
    questions.push(generateQuestion(rng, level, level === 2 ? legend : null));
  }

  return { legend, questions };
}

export function evaluateAnswer(question: MathQuestion, userAnswer: number): boolean {
  return userAnswer === question.answer;
}
