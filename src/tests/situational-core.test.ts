import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSituationalEngine } from '../hooks/useSituationalEngine';

describe('Situational Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('должен инициализироваться в неактивном состоянии', () => {
    const { result } = renderHook(() => useSituationalEngine());
    expect(result.current.state.isActive).toBe(false);
    expect(result.current.state.questions.length).toBe(0);
  });

  it('должен загружать вопросы при старте', () => {
    const { result } = renderHook(() => useSituationalEngine());
    act(() => {
      result.current.startGame();
    });

    expect(result.current.state.isActive).toBe(true);
    expect(result.current.state.questions.length).toBeGreaterThan(0);
    expect(result.current.state.currentIndex).toBe(0);
  });

  it('должен переходить к следующему вопросу и суммировать очки', () => {
    const { result } = renderHook(() => useSituationalEngine());
    act(() => {
      result.current.startGame();
    });

    const initialScore = result.current.state.score;
    const testScore = 10;

    act(() => {
      result.current.answerQuestion(testScore);
    });

    expect(result.current.state.score).toBe(initialScore + testScore);
    expect(result.current.state.currentIndex).toBe(1);
  });

  it('должен завершать игру после последнего вопроса', () => {
    const { result } = renderHook(() => useSituationalEngine());
    act(() => {
      result.current.startGame();
    });

    // Answer all questions
    const qCount = result.current.state.questions.length;
    for(let i=0; i<qCount; i++) {
        act(() => {
            result.current.answerQuestion(5);
        });
    }

    expect(result.current.state.isFinished).toBe(true);
    expect(result.current.state.isActive).toBe(false);
  });
});
