import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSchulteEngine, GameMode } from '../hooks/useSchulteEngine';
import { generateGrid } from '../lib/schulte-generator';
import { eventBus } from '../lib/event-bus';

// Mock analytics to avoid WASM issues in tests
vi.mock('../lib/cognitive-metrics', () => ({
  getDifficultySuggestion: vi.fn().mockResolvedValue({
    nextGridSize: 5,
    noiseLevel: 0,
    rotationEnabled: false,
    message: 'Test'
  }),
  analyzeSession: vi.fn()
}));

describe('Schulte Core Architecture (Event-Driven)', () => {
  let perfTime = 0;
  
  beforeEach(() => {
    vi.clearAllMocks();
    perfTime = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => perfTime);
  });

  // --- БЛОК 1: Математические Unit-тесты генератора ---
  describe('Generator (Unit Tests)', () => {
    it('должен генерировать 25 уникальных чисел для таблицы 5x5', () => {
      const grid = generateGrid(5, 'classic');
      const numbers = grid.map(c => c.num);
      const uniqueNumbers = new Set(numbers);
      
      expect(grid.length).toBe(25);
      expect(uniqueNumbers.size).toBe(25);
    });

    it('должен быть детерминированным при использовании фиксированного seed', () => {
      const seed = 12345;
      const grid1 = generateGrid(5, 'classic', seed);
      const grid2 = generateGrid(5, 'classic', seed);
      expect(grid1).toEqual(grid2);
    });
  });

  // --- БЛОК 2: Событийные тесты игровой логики (Headless) ---
  describe('Game Logic (Event-Driven Integration)', () => {
    
    const runFullGame = (size: number, mode: GameMode) => {
      const trainingCompleteSpy = vi.fn();
      eventBus.on('TRAINING_COMPLETE', trainingCompleteSpy);

      const { result } = renderHook(() => useSchulteEngine(size, mode));
      act(() => { result.current.startGame(42) });

      const sequence = [...result.current.state.expectedSequence];
      for (const expectedCell of sequence) {
        const gridCell = result.current.state.grid.find(c => 
          (mode === 'gorbov' || mode.startsWith('gorbov_'))
            ? (c.num === expectedCell.num && c.color === expectedCell.color)
            : (c.num === expectedCell.num)
        )!;
        const gridIndex = result.current.state.grid.indexOf(gridCell);
        act(() => { result.current.clickCell(gridCell, gridIndex) });
      }

      return { state: result.current.state, spy: trainingCompleteSpy };
    };

    it('должен проходить таблицу 3x3 (Classic)', () => {
      const { state, spy } = runFullGame(3, 'classic');
      expect(state.isFinished).toBe(true);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ size: 3 }));
    });

    it('должен проходить таблицу 5x5 (Reverse)', () => {
      const { state, spy } = runFullGame(5, 'reverse');
      expect(state.isFinished).toBe(true);
      expect(state.expectedSequence[0].num).toBe(25); // Reverse check
      expect(spy).toHaveBeenCalled();
    });

    it('должен проходить таблицу Горбова-Шульте (Черно-красную)', () => {
      const { state, spy } = runFullGame(5, 'gorbov');
      expect(state.isFinished).toBe(true);
      expect(state.expectedSequence.length).toBe(25); 
      expect(spy).toHaveBeenCalled();
    });

    it('должен проходить таблицу Горбова-Шульте v2 (Прямой/Прямой)', () => {
      const { state, spy } = runFullGame(5, 'gorbov_v2');
      expect(state.isFinished).toBe(true);
      expect(spy).toHaveBeenCalled();
    });

    it('должен проходить таблицу Горбова-Шульте v3 (Обратный/Прямой)', () => {
      const { state, spy } = runFullGame(5, 'gorbov_v3');
      expect(state.isFinished).toBe(true);
      expect(spy).toHaveBeenCalled();
    });

    it('должен проходить таблицу Горбова-Шульте v4 (Обратный/Обратный)', () => {
      const { state, spy } = runFullGame(5, 'gorbov_v4');
      expect(state.isFinished).toBe(true);
      expect(spy).toHaveBeenCalled();
    });

    it('Негативный сценарий: ошибка игрока -> MistakeMade', () => {
      const mistakeMadeSpy = vi.fn();
      eventBus.on('MISTAKE_MADE', mistakeMadeSpy);

      const { result } = renderHook(() => useSchulteEngine(5, 'classic'));
      act(() => { result.current.startGame(123) });

      const wrongCell = result.current.state.grid.find(c => c.num === 5)!;
      act(() => { result.current.clickCell(wrongCell, 0) });

      expect(mistakeMadeSpy).toHaveBeenCalledWith(expect.objectContaining({
        expected: 1,
        actual: 5
      }));
      expect(result.current.state.expectedIndex).toBe(0);
    });
  });

  // --- БЛОК 3: Тестирование системы метрик (Mock Clock) ---
  describe('Metrics & Reaction Time (Mock Clock)', () => {
    it('должен корректно рассчитывать время реакции', () => {
      const cellClickSpy = vi.fn();
      eventBus.on('CELL_CLICK', cellClickSpy);

      const { result } = renderHook(() => useSchulteEngine(5, 'classic'));
      
      act(() => { result.current.startGame() }); // perfTime = 1000

      perfTime += 500; // Прошло 500мс
      const firstCell = result.current.state.grid.find(c => c.num === 1)!;
      act(() => { result.current.clickCell(firstCell, 0) });

      expect(cellClickSpy).toHaveBeenLastCalledWith(expect.objectContaining({
        reactionTimeMs: 500
      }));

      perfTime += 1200; // Прошло еще 1200мс
      const secondCell = result.current.state.grid.find(c => c.num === 2)!;
      act(() => { result.current.clickCell(secondCell, 1) });

      expect(cellClickSpy).toHaveBeenLastCalledWith(expect.objectContaining({
        reactionTimeMs: 1200
      }));
    });
  });
});
