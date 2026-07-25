/**
 * Deterministic generator for Schulte Table 1-90 (Задание №8).
 * 9 rows x 10 columns = 90 cells, numbers 1-90, classic (forward) order only.
 */

import type { CellValue } from '../hooks/useSchulteEngine';

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
}

export const SCHULTE_90_ROWS = 9;
export const SCHULTE_90_COLS = 10;
export const SCHULTE_90_TOTAL = SCHULTE_90_ROWS * SCHULTE_90_COLS; // 90

export type GorbovRuleId = 'black-red' | 'red-black' | 'black-pairs' | 'red-pairs';

export const GORBOV_RULES: ReadonlyArray<{
  id: GorbovRuleId;
  title: string;
  description: string;
}> = [
  { id: 'black-red', title: 'Чёрный → красный', description: 'Чередование цветов, начиная с чёрного.' },
  { id: 'red-black', title: 'Красный → чёрный', description: 'Чередование цветов, начиная с красного.' },
  { id: 'black-pairs', title: 'Пары: чёрный → красный', description: 'Две чёрные, затем две красные клетки.' },
  { id: 'red-pairs', title: 'Пары: красный → чёрный', description: 'Две красные, затем две чёрные клетки.' },
] as const;

const MIN_SCORE = 10;
const MAX_SCORE = 1000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function computeSchulte90Score(timeMs: number, errors: number): number {
  const safeTimeMs = Math.max(1, timeMs);
  const safeErrors = Math.max(0, errors);
  const speedScore = clamp(Math.floor(100000 / safeTimeMs), MIN_SCORE, MAX_SCORE);
  const accuracy = clamp(SCHULTE_90_TOTAL / (SCHULTE_90_TOTAL + safeErrors), 0.2, 1);
  const complexity = 1.31;
  return clamp(Math.round(speedScore * accuracy * complexity - safeErrors * 5), MIN_SCORE, MAX_SCORE);
}

/**
 * Generate a shuffled 9x10 grid of numbers 1-90.
 */
export function generateSchulte90Grid(seed?: number): CellValue[] {
  const rng = seed !== undefined ? new SeededRandom(seed) : null;
  const random = () => (rng ? rng.next() : Math.random());

  const cells: CellValue[] = [];
  for (let i = 1; i <= SCHULTE_90_TOTAL; i++) {
    cells.push({ id: i, num: i, color: 'black' });
  }

  // Fisher-Yates Shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  return cells;
}

/**
 * Generate the expected sequence: numbers 1 to 90 in forward order.
 */
export function generateSchulte90Sequence(): CellValue[] {
  const seq: CellValue[] = [];
  for (let i = 1; i <= SCHULTE_90_TOTAL; i++) {
    seq.push({ id: i - 1, num: i, color: 'black' });
  }
  return seq;
}

export function generateGorbov90Table(
  rule: GorbovRuleId = 'black-red',
  seed?: number,
): { grid: CellValue[]; sequence: CellValue[] } {
  const sequence = generateSchulte90Sequence().map((cell, index) => ({
    ...cell,
    color: getGorbovColor(rule, index),
  }));
  const grid = generateSchulte90Grid(seed).map((cell) => ({
    ...cell,
    color: sequence[cell.num - 1].color,
  }));
  return { grid, sequence };
}

export function getGorbovColor(rule: GorbovRuleId, index: number): 'black' | 'red' {
  const groupSize = rule.endsWith('pairs') ? 2 : 1;
  const startsRed = rule.startsWith('red');
  const group = Math.floor(index / groupSize);
  const isRed = (group + (startsRed ? 1 : 0)) % 2 === 1;
  return isRed ? 'red' : 'black';
}
