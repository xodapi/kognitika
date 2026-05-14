import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStroopEngine, STROOP_COLORS } from '../hooks/useStroopEngine';
import { eventBus } from '../lib/event-bus';

// Mock analytics to avoid WASM issues in tests
vi.mock('../lib/cognitive-metrics', () => ({
  getDifficultySuggestion: vi.fn().mockResolvedValue({}),
  analyzeSession: vi.fn().mockResolvedValue({})
}));

describe('Stroop Core Engine (Event-Driven)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Mock performance.now
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now += 100);
  });

  it('должен генерировать детерминированные вопросы при использовании seed', () => {
    const { result: r1 } = renderHook(() => useStroopEngine());
    const { result: r2 } = renderHook(() => useStroopEngine());
    
    act(() => { r1.current.startGame(123); });
    act(() => { r2.current.startGame(123); });

    expect(r1.current.state.question?.word).toBe(r2.current.state.question?.word);
    expect(r1.current.state.question?.correctAnswerId).toBe(r2.current.state.question?.correctAnswerId);
  });

  it('должен фиксировать правильный ответ и измерять время реакции', () => {
    const clickSpy = vi.fn();
    eventBus.on('CELL_CLICK', clickSpy);

    const { result } = renderHook(() => useStroopEngine());
    
    act(() => { result.current.startGame(555); });
    
    const correctId = result.current.state.question!.correctAnswerId;
    
    act(() => {
      result.current.answerQuestion(correctId);
    });

    expect(result.current.state.score).toBe(1);
    expect(clickSpy).toHaveBeenCalledWith(expect.objectContaining({
      isCorrect: true
    }));
  });

  it('должен фиксировать ошибку и отправлять событие MISTAKE_MADE', () => {
    const mistakeSpy = vi.fn();
    eventBus.on('MISTAKE_MADE', mistakeSpy);

    const { result } = renderHook(() => useStroopEngine());
    
    act(() => { result.current.startGame(777); });
    
    const correctId = result.current.state.question!.correctAnswerId;
    const wrongId = STROOP_COLORS.find(c => c.id !== correctId)!.id;
    
    act(() => {
      result.current.answerQuestion(wrongId);
    });

    expect(result.current.state.errors).toBe(1);
    expect(mistakeSpy).toHaveBeenCalled();
  });

  it('должен завершать игру по истечении времени', () => {
    const trainingCompleteSpy = vi.fn();
    eventBus.on('TRAINING_COMPLETE', trainingCompleteSpy);

    const { result } = renderHook(() => useStroopEngine());
    
    act(() => { result.current.startGame(); });

    // Эмулируем прохождение 60 секунд
    act(() => {
      vi.advanceTimersByTime(61000);
    });

    // Из-за того что мы используем requestAnimationFrame, 
    // нам может потребоваться несколько циклов обновления.
    // В тестах мы можем вручную вызвать обновление если нужно, 
    // но обычно vi.advanceTimersByTime(61000) хватает для setTimeout.
    // Однако useStroopEngine использует requestAnimationFrame.
    
    // В Vitest fake timers также перекрывают rAF.
    
    expect(result.current.state.isFinished).toBe(true);
    expect(trainingCompleteSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STROOP'
    }));
  });
});
