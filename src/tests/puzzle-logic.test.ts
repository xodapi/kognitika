import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '../lib/event-bus';
import { HeadlessRunner } from '../lib/headless-runner';

vi.mock('../lib/cognitive-metrics', () => ({
  getDifficultySuggestion: vi.fn().mockResolvedValue({
    nextGridSize: 5,
    noiseLevel: 0,
    rotationEnabled: false,
    message: 'Test Suggestion'
  }),
  analyzeSession: vi.fn()
}));

// Тест-кейс "Решение когнитивной головоломки" (Headless Integration)
// Аналогия Tomb Raider: 
// LeverPulled(1) -> CELL_CLICK(1)
// PuzzleSolved -> TRAINING_COMPLETE
describe('Schulte Puzzle Logic (Tomb Raider Style)', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('должен игнорировать неверную последовательность и завершаться только при правильной', async () => {
    const puzzleSolvedHandler = vi.fn();
    const errorHandler = vi.fn();

    // Подписываемся на "Дверь открылась" (Успех) и "Ловушка" (Ошибка)
    eventBus.on('TRAINING_COMPLETE', puzzleSolvedHandler);
    eventBus.on('CELL_CLICK', (data) => {
      if (!data.isCorrect) errorHandler();
    });

    // Сценарий 1: Неверная комбинация [1, 3, 2] при ожидаемой [1, 2, 3]
    const wrongSequence = [
      { timestamp: 100, event: 'CELL_CLICK', data: { num: 1, color: 'black', cellId: 10, gridIndex: 0, reactionTimeMs: 100, isCorrect: true } },
      { timestamp: 200, event: 'CELL_CLICK', data: { num: 3, color: 'black', cellId: 12, gridIndex: 2, reactionTimeMs: 100, isCorrect: false } }, // Ошибка!
      { timestamp: 300, event: 'CELL_CLICK', data: { num: 2, color: 'black', cellId: 11, gridIndex: 1, reactionTimeMs: 100, isCorrect: true } },
    ];

    const runner1 = new HeadlessRunner(wrongSequence as any);
    runner1.replaySync();

    // Проверяем: "Ловушка" сработала, "Дверь" всё еще закрыта
    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(puzzleSolvedHandler).not.toHaveBeenCalled();

    // Сценарий 2: Дожимаем правильную кнопку [3]
    const finalStep = [
      { timestamp: 400, event: 'CELL_CLICK', data: { num: 3, color: 'black', cellId: 12, gridIndex: 2, reactionTimeMs: 100, isCorrect: true } },
      { timestamp: 500, event: 'TRAINING_COMPLETE', data: { type: 'SCHULTE', timeMs: 500, accuracy: 75, score: 300 } }
    ];

    const runner2 = new HeadlessRunner(finalStep as any);
    runner2.replaySync();

    // Проверяем: "Дверь" открылась!
    expect(puzzleSolvedHandler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SCHULTE'
    }));
  });
});
