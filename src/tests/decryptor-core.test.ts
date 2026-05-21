import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDecryptorEngine } from '../hooks/useDecryptorEngine';
import { eventBus } from '../lib/event-bus';

describe('Decryptor Core Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('должен инициализироваться с фазой memorize', () => {
    const { result } = renderHook(() => useDecryptorEngine());
    expect(result.current.state.phase).toBe('memorize');
    expect(result.current.state.memorizeTimeLeft).toBe(10);
  });

  it('должен переходить в фазу scan после завершения таймера запоминания', () => {
    const { result } = renderHook(() => useDecryptorEngine());
    
    // Start game to ensure fresh state
    act(() => {
        result.current.startGame(1);
    });

    // Advance 10 seconds step by step
    for (let i = 0; i < 10; i++) {
        act(() => {
            vi.advanceTimersByTime(1000);
        });
    }

    // Now it should be at 0, the next tick should trigger scan phase
    act(() => {
        vi.advanceTimersByTime(0);
    });

    expect(result.current.state.phase).toBe('scan');
    expect(result.current.state.activeCard).not.toBeNull();
  });

  it('должен начислять очки за правильный ответ', () => {
    const { result } = renderHook(() => useDecryptorEngine());
    const hitSpy = vi.fn();
    eventBus.on('HIT', hitSpy);

    act(() => {
        result.current.startGame(1);
    });

    for (let i = 0; i < 11; i++) {
        act(() => {
            vi.advanceTimersByTime(1000);
        });
    }

    const activeCard = result.current.state.activeCard;
    expect(activeCard).toBeDefined();
    const correctAnswer = activeCard?.metadata?.fact;
    expect(correctAnswer).toBeDefined();

    act(() => {
      result.current.handleAnswer(correctAnswer!);
    });

    expect(result.current.state.score).toBe(100);
    expect(result.current.state.hits).toBe(1);
  });

  it('должен вычитать очки за неправильный ответ', () => {
    const { result } = renderHook(() => useDecryptorEngine());
    const missSpy = vi.fn();
    eventBus.on('MISS', missSpy);

    act(() => {
        result.current.startGame(1);
    });

    for (let i = 0; i < 11; i++) {
        act(() => {
            vi.advanceTimersByTime(1000);
        });
    }

    act(() => {
      result.current.handleAnswer('WRONG_ANSWER_TEXT_RANDOM');
    });

    expect(result.current.state.score).toBe(0); 
    expect(result.current.state.misses).toBe(1);
  });

  it('должен завершать игру по истечении времени', () => {
    const { result } = renderHook(() => useDecryptorEngine());
    
    act(() => {
        result.current.startGame(1);
    });

    // 10s memorize
    for (let i = 0; i < 11; i++) {
        act(() => {
            vi.advanceTimersByTime(1000);
        });
    }

    // 60s scan
    for (let i = 0; i < 601; i++) {
        act(() => {
            vi.advanceTimersByTime(100);
        });
    }

    expect(result.current.state.phase).toBe('result');
    expect(result.current.state.timeMs).toBe(0);
  });
});
