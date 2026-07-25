import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAlphabetTableEngine } from '../hooks/useAlphabetTableEngine';
import { eventBus } from '../lib/event-bus';
import {
  generateAlphabetTable,
  type AlphabetAction,
} from '../lib/alphabet-table-generator';

function incorrectAction(expected: AlphabetAction): AlphabetAction {
  return expected === 'RIGHT' ? 'LEFT' : 'RIGHT';
}

describe('alphabet-table engine', () => {
  let perfTime = 1000;

  beforeEach(() => {
    perfTime = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => perfTime);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('tracks deterministic answers, completion, and aggregate reaction time', () => {
    const generatedSet = generateAlphabetTable(9, 'balanced', 42);
    const completeSpy = vi.fn();
    const unsubscribe = eventBus.on('TRAINING_COMPLETE', completeSpy);
    const { result } = renderHook(() => useAlphabetTableEngine());

    act(() => result.current.startGame('balanced', 9, generatedSet));

    generatedSet.items.forEach((item, index) => {
      perfTime += 100;
      act(() => {
        result.current.submitAction(index === 0 ? incorrectAction(item.action) : item.action);
      });
    });

    expect(result.current.state.outcome).toBe('completed');
    expect(result.current.state.isFinished).toBe(true);
    expect(result.current.state.correctAnswers).toBe(8);
    expect(result.current.state.errors).toBe(1);
    expect(result.current.state.timeMs).toBe(900);
    expect(result.current.state.averageReactionTimeMs).toBe(100);
    expect(completeSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'ALPHABET_TABLE',
      errors: 1,
      metadata: expect.objectContaining({
        mode: 'balanced',
        correctAnswers: 8,
        totalQuestions: 9,
        averageReactionTimeMs: 100,
      }),
    }));
    unsubscribe();
  });

  it('marks an early stop as aborted without emitting completion', () => {
    const completeSpy = vi.fn();
    const unsubscribe = eventBus.on('TRAINING_COMPLETE', completeSpy);
    const { result } = renderHook(() => useAlphabetTableEngine());

    act(() => result.current.startGame('switching', 9, undefined, 8));
    perfTime += 450;
    act(() => result.current.stopGame());

    expect(result.current.state.outcome).toBe('aborted');
    expect(result.current.state.timeMs).toBe(450);
    expect(completeSpy).not.toHaveBeenCalled();
    unsubscribe();
  });
});
