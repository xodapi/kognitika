import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNBackEngine } from '../hooks/useNBackEngine';
import { eventBus } from '../lib/event-bus';

// Mock analytics to avoid WASM issues in tests
vi.mock('../lib/cognitive-metrics', () => ({
  getDifficultySuggestion: vi.fn().mockResolvedValue({}),
  analyzeSession: vi.fn().mockResolvedValue({})
}));

describe('N-Back Core Engine (Event-Driven)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('должен генерировать детерминированную последовательность при использовании seed', () => {
    const { result: r1 } = renderHook(() => useNBackEngine(2));
    const { result: r2 } = renderHook(() => useNBackEngine(2));
    
    act(() => { r1.current.startGame(12345); });
    act(() => { r2.current.startGame(12345); });

    act(() => { vi.advanceTimersByTime(600); }); // Round 1

    expect(r1.current.state.currentStimulus).toBe(r2.current.state.currentStimulus);
  });

  it('должен фиксировать ошибку при неверном клике (ложное срабатывание)', () => {
    const mistakeMadeSpy = vi.fn();
    eventBus.on('MISTAKE_MADE', mistakeMadeSpy);

    const { result } = renderHook(() => useNBackEngine(2));
    
    act(() => { result.current.startGame(100); }); // Seed with no match on first rounds
    act(() => { vi.advanceTimersByTime(600); }); // Round 1

    act(() => {
       result.current.answerMatch(); // Click when not a match
    });

    expect(result.current.state.errors).toBe(1);
    expect(mistakeMadeSpy).toHaveBeenCalledWith(expect.objectContaining({
        actual: 'match_click',
        expected: 'no_match'
    }));
  });

  it('должен фиксировать ошибку при пропуске совпадения', () => {
    const mistakeMadeSpy = vi.fn();
    eventBus.on('MISTAKE_MADE', mistakeMadeSpy);

    const { result } = renderHook(() => useNBackEngine(1)); // 1-back is easier to test
    
    // Manual sequence control via seed or multiple rounds
    act(() => { result.current.startGame(123); }); 
    
    // Simulate rounds until a match occurs
    for(let i=0; i<5; i++) {
        act(() => { vi.advanceTimersByTime(2600); });
        if (result.current.state.isMatch) break;
    }

    const matchRound = result.current.state.round;
    
    // Advance to next round without clicking
    act(() => { vi.advanceTimersByTime(2600); });

    expect(result.current.state.errors).toBeGreaterThan(0);
    expect(mistakeMadeSpy).toHaveBeenCalledWith(expect.objectContaining({
        actual: 'missed_click',
        expected: 'match_click'
    }));
  });

  it('должен завершать тренировку после 20 раундов', async () => {
    const trainingCompleteSpy = vi.fn();
    eventBus.on('TRAINING_COMPLETE', trainingCompleteSpy);

    const { result } = renderHook(() => useNBackEngine(2));
    
    act(() => { result.current.startGame(); });

    // Advance all timers round by round
    for (let i = 0; i < 21; i++) {
        act(() => {
            vi.runOnlyPendingTimers();
        });
    }

    expect(result.current.state.isFinished).toBe(true);

    expect(trainingCompleteSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'NBACK'
    }));
  });
});
