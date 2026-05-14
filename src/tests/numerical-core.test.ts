import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNumericalEngine } from '../hooks/useNumericalEngine';
import { eventBus } from '../lib/event-bus';

// Mock analytics to avoid WASM issues in tests
vi.mock('../lib/cognitive-metrics', () => ({
  getDifficultySuggestion: vi.fn().mockResolvedValue({ nextGridSize: 5, noiseLevel: 0, rotationEnabled: false, message: 'Keep going!' }),
  analyzeSession: vi.fn().mockResolvedValue({ score: 100, level: 1 })
}));

describe('Numerical Core Engine (Event-Driven)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now += 100);
  });

  it('должен генерировать детерминированные вопросы при использовании seed', () => {
    const { result: r1 } = renderHook(() => useNumericalEngine());
    const { result: r2 } = renderHook(() => useNumericalEngine());
    
    act(() => { r1.current.startGame(123456); });
    act(() => { r2.current.startGame(123456); });

    expect(r1.current.state.questions[0].title).toBe(r2.current.state.questions[0].title);
    expect(r1.current.state.questions[0].correctAnswer).toBe(r2.current.state.questions[0].correctAnswer);
  });

  it('должен проходить 5 вопросов и отправлять TRAINING_COMPLETE', () => {
    const trainingCompleteSpy = vi.fn();
    eventBus.on('TRAINING_COMPLETE', trainingCompleteSpy);

    const { result } = renderHook(() => useNumericalEngine());
    
    act(() => { result.current.startGame(777); });
    
    for (let i = 0; i < 5; i++) {
      const correctVal = result.current.state.questions[i].correctAnswer;
      act(() => {
        result.current.answerQuestion(correctVal);
      });
    }

    expect(result.current.state.isFinished).toBe(true);
    expect(result.current.state.score).toBe(5);
    expect(trainingCompleteSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'NUMERICAL_ANALYSIS',
      score: 5
    }));
  });

  it('должен завершать игру по таймеру', () => {
    const { result } = renderHook(() => useNumericalEngine());
    
    act(() => { result.current.startGame(); });

    act(() => {
      vi.advanceTimersByTime(61000);
    });

    expect(result.current.state.isFinished).toBe(true);
  });
});
