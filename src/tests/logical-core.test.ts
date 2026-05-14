import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLogicalEngine } from '../hooks/useLogicalEngine';
import { eventBus } from '../lib/event-bus';

// Mock analytics
vi.mock('../lib/cognitive-metrics', () => ({
  getDifficultySuggestion: vi.fn().mockResolvedValue({}),
  analyzeSession: vi.fn().mockResolvedValue({})
}));

describe('Logical Matrix Core Engine (Event-Driven)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now += 100);
  });

  it('должен генерировать детерминированные матрицы при использовании seed', () => {
    const { result: r1 } = renderHook(() => useLogicalEngine());
    const { result: r2 } = renderHook(() => useLogicalEngine());
    
    act(() => { r1.current.startGame(12345); });
    act(() => { r2.current.startGame(12345); });

    expect(r1.current.state.questions[0].id).toBe(r2.current.state.questions[0].id);
    expect(r1.current.state.questions[0].correctOptionIndex).toBe(r2.current.state.questions[0].correctOptionIndex);
  });

  it('должен проходить все 3 матрицы и отправлять TRAINING_COMPLETE', () => {
    const trainingCompleteSpy = vi.fn();
    eventBus.on('TRAINING_COMPLETE', trainingCompleteSpy);

    const { result } = renderHook(() => useLogicalEngine());
    
    act(() => { result.current.startGame(999); });
    
    // Проходим 3 вопроса
    for (let i = 0; i < 3; i++) {
      const correctIdx = result.current.state.questions[i].correctOptionIndex;
      act(() => {
        result.current.answerQuestion(correctIdx);
      });
    }

    expect(result.current.state.isFinished).toBe(true);
    expect(result.current.state.score).toBe(3);
    expect(trainingCompleteSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'LOGICAL_SEQUENCE',
      score: 3
    }));
  });

  it('должен фиксировать ошибки через MISTAKE_MADE', () => {
    const mistakeSpy = vi.fn();
    eventBus.on('MISTAKE_MADE', mistakeSpy);

    const { result } = renderHook(() => useLogicalEngine());
    
    act(() => { result.current.startGame(888); });
    
    const curQ = result.current.state.questions[0];
    const wrongIdx = (curQ.correctOptionIndex + 1) % 4;
    
    act(() => {
      result.current.answerQuestion(wrongIdx);
    });

    expect(result.current.state.errors).toBe(1);
    expect(mistakeSpy).toHaveBeenCalled();
  });
});
