import { describe, it, expect } from 'vitest';
import { calculateLuscherShift } from '../hooks/useLuscherEngine';

describe('Luscher Color Engine (Core)', () => {
  it('сравнивает порядок выбора без вывода о состоянии', () => {
    const before = [4, 5, 6, 7, 0, 1, 2, 3];
    const after = [0, 1, 2, 3, 4, 5, 6, 7];
    const result = calculateLuscherShift(before, after);
    expect(result.scoreChange).toBeGreaterThan(0);
    expect(result.comparison).toBe('higher');
  });

  it('возвращает lower для меньшего условного показателя', () => {
    const before = [0, 1, 2, 3, 4, 5, 6, 7];
    const after = [7, 6, 5, 4, 0, 1, 2, 3];
    const result = calculateLuscherShift(before, after);
    expect(result.scoreChange).toBeLessThan(0);
    expect(result.comparison).toBe('lower');
  });

  it('возвращает unchanged при одинаковом порядке', () => {
    const before = [0, 1, 2, 3, 4, 5, 6, 7];
    const after = [0, 1, 2, 3, 4, 5, 6, 7];
    const result = calculateLuscherShift(before, after);
    expect(result.scoreChange).toBe(0);
    expect(result.comparison).toBe('unchanged');
  });
});
