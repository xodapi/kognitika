import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMentalMathEngine } from '../hooks/useMentalMathEngine';
import { eventBus } from '../lib/event-bus';

describe('mental-math completion outcomes', () => {
  let perfTime = 1000;

  beforeEach(() => {
    vi.spyOn(performance, 'now').mockImplementation(() => perfTime);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('marks an early stop as incomplete without emitting completion', () => {
    const completeSpy = vi.fn();
    const unsubscribe = eventBus.on('TRAINING_COMPLETE', completeSpy);
    const { result } = renderHook(() => useMentalMathEngine());

    act(() => result.current.startGame(1, 20, undefined, 42));
    perfTime += 2500;
    act(() => result.current.stopGame());

    expect(result.current.state.outcome).toBe('aborted');
    expect(result.current.state.isFinished).toBe(true);
    expect(result.current.state.timeMs).toBe(2500);
    expect(completeSpy).not.toHaveBeenCalled();
    unsubscribe();
  });
});
