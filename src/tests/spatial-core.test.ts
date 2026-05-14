import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpatialEngine } from '../hooks/useSpatialEngine';
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

describe('Spatial Core Engine (Event-Driven)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('должен переходить из фазы memorize в recall по таймеру', () => {
    const { result } = renderHook(() => useSpatialEngine());
    
    act(() => {
      result.current.startTraining();
    });

    expect(result.current.state.phase).toBe('memorize');

    // Ждем окончания времени запоминания
    act(() => {
      vi.advanceTimersByTime(5000); // Level 1 memo time is around 2.8s
    });

    expect(result.current.state.phase).toBe('recall');
  });

  it('должен фиксировать ошибку при клике на пустую ячейку', () => {
    const mistakeMadeSpy = vi.fn();
    eventBus.on('MISTAKE_MADE', mistakeMadeSpy);

    const { result } = renderHook(() => useSpatialEngine());
    
    act(() => {
      result.current.startTraining();
    });

    // Переходим в фазу ответа
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Находим пустую ячейку
    const emptyCell = result.current.state.grid.find(c => !c.isActive)!;
    
    act(() => {
      result.current.handleCellClick(emptyCell.id);
    });

    expect(result.current.state.phase).toBe('result');
    expect(result.current.state.errors).toBe(1);
    expect(mistakeMadeSpy).toHaveBeenCalled();
  });

  it('должен переходить на следующий уровень при правильном вводе', () => {
    const { result } = renderHook(() => useSpatialEngine());
    
    act(() => {
      result.current.startTraining();
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const activeCells = result.current.state.grid.filter(c => c.isActive);
    
    activeCells.forEach(cell => {
      act(() => {
        result.current.handleCellClick(cell.id);
      });
    });

    // После клика на все активные ячейки должен запуститься таймер перехода
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.state.level).toBe(2);
  });
});
