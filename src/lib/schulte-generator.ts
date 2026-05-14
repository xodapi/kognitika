import { GameMode, CellValue } from '../hooks/useSchulteEngine';

/**
 * Deterministic PRNG for Schulte Table generation
 */
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

export const generateExpectedSequence = (size: number, mode: GameMode): CellValue[] => {
  const total = size * size;
  const seq: CellValue[] = [];
  
  if (mode === 'classic') {
    for (let i = 1; i <= total; i++) seq.push({ id: 0, num: i, color: 'black' });
  } else if (mode === 'reverse') {
    for (let i = total; i >= 1; i--) seq.push({ id: 0, num: i, color: 'black' });
  } else if (mode === 'gorbov') {
    const blackCount = Math.ceil(total / 2);
    const redCount = Math.floor(total / 2);
    let b = 1, r = redCount;
    while (b <= blackCount || r >= 1) {
      if (b <= blackCount) { seq.push({ id: 0, num: b, color: 'black' }); b++; }
      if (r >= 1) { seq.push({ id: 0, num: r, color: 'red' }); r--; }
    }
  } else {
    for (let i = 1; i <= total; i++) seq.push({ id: 0, num: i, color: 'black' });
  }
  
  seq.forEach((c, idx) => c.id = idx);
  return seq;
};

export const generateGrid = (size: number, mode: GameMode, seed?: number): CellValue[] => {
  const total = size * size;
  const cells: CellValue[] = [];
  const rng = seed !== undefined ? new SeededRandom(seed) : null;
  
  const random = () => rng ? rng.next() : Math.random();

  if (mode === 'gorbov') {
    const blackCount = Math.ceil(total / 2);
    const redCount = Math.floor(total / 2);
    for (let i = 1; i <= blackCount; i++) cells.push({ id: i, num: i, color: 'black' });
    for (let i = 1; i <= redCount; i++) cells.push({ id: i + blackCount, num: i, color: 'red' });
  } else {
    for (let i = 1; i <= total; i++) cells.push({ id: i, num: i, color: 'black' });
  }

  // Fisher-Yates Shuffle (Deterministic if seed provided)
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
};
