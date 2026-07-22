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
