import { describe, it, expect } from 'vitest';
import { calculateLuscherShift } from '../hooks/useLuscherEngine';

describe('Luscher Color Engine (Core)', () => {
  it('должен корректно определять положительный сдвиг (базовые цвета переместились вперед)', () => {
    const before = [4, 5, 6, 7, 0, 1, 2, 3]; // Вспомогательные в начале
    const after = [0, 1, 2, 3, 4, 5, 6, 7];  // Базовые вышли вперед
    const result = calculateLuscherShift(before, after);
    expect(result.scoreChange).toBeGreaterThan(0);
    expect(result.emotionalState).toBe('improvement');
  });

  it('должен определять переутомление при сдвиге вспомогательных цветов вперед', () => {
    const before = [0, 1, 2, 3, 4, 5, 6, 7];
    const after = [7, 6, 5, 4, 0, 1, 2, 3]; // Вспомогательные в начале
    const result = calculateLuscherShift(before, after);
    expect(result.scoreChange).toBeLessThan(0);
    expect(result.emotionalState).toBe('fatigue');
  });

  it('должен возвращать стабильный статус при отсутствии значительных сдвигов', () => {
    const before = [0, 1, 2, 3, 4, 5, 6, 7];
    const after = [0, 1, 2, 3, 4, 5, 6, 7];
    const result = calculateLuscherShift(before, after);
    expect(result.scoreChange).toBe(0);
    expect(result.emotionalState).toBe('stable');
  });
});
