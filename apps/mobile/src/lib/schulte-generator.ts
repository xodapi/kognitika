/**
 * Schulte grid generator for mobile.
 * This is a standalone copy of the web generator (src/lib/schulte-generator.ts)
 * to avoid Metro bundler cross-workspace issues.
 *
 * Types are kept local — no React-specific imports.
 */

export type GameMode = 'classic' | 'reverse';

export interface CellValue {
  id: number;
  num: number;
  color: 'black' | 'red';
}

/** Deterministic PRNG (same algorithm as web) */
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export function generateExpectedSequence(size: number, mode: GameMode): CellValue[] {
  const total = size * size;
  const seq: CellValue[] = [];

  if (mode === 'classic') {
    for (let i = 1; i <= total; i++) seq.push({ id: 0, num: i, color: 'black' });
  } else if (mode === 'reverse') {
    for (let i = total; i >= 1; i--) seq.push({ id: 0, num: i, color: 'black' });
  } else {
    for (let i = 1; i <= total; i++) seq.push({ id: 0, num: i, color: 'black' });
  }

  seq.forEach((c, idx) => c.id = idx);
  return seq;
}

export function generateGrid(size: number, mode: GameMode, seed?: number): CellValue[] {
  const total = size * size;
  const cells: CellValue[] = [];
  const rng = seed !== undefined ? new SeededRandom(seed) : null;
  const random = () => rng ? rng.next() : Math.random();

  for (let i = 1; i <= total; i++) {
    cells.push({ id: i, num: i, color: 'black' });
  }

  // Fisher-Yates Shuffle (deterministic if seed provided)
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
}
