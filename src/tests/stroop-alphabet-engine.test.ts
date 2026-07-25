import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useStroopAlphabetEngine } from '../hooks/useStroopAlphabetEngine';
import { eventBus } from '../lib/event-bus';
import { generateStroopAlphabetSet } from '../lib/stroop-alphabet-generator';

describe('stroop-alphabet engine', () => {
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

  it('scores color and action errors separately and emits aggregate completion', () => {
    const generatedSet = generateStroopAlphabetSet(3, 42);
    const completeSpy = vi.fn();
    const unsubscribe = eventBus.on('TRAINING_COMPLETE', completeSpy);
    const { result } = renderHook(() => useStroopAlphabetEngine());

    act(() => result.current.startGame(3, generatedSet));
    generatedSet.items.forEach((item, index) => {
      perfTime += 100;
      const wrongColor = item.wordColorId === 'red' ? 'blue' : 'red';
      act(() => result.current.submitColor(index === 0 ? wrongColor : item.wordColorId));
      perfTime += 100;
      const wrongAction = item.action === 'RIGHT' ? 'LEFT' : 'RIGHT';
      act(() => result.current.submitAction(index === 1 ? wrongAction : item.action));
    });

    expect(result.current.state.outcome).toBe('completed');
    expect(result.current.state.colorErrors).toBe(1);
    expect(result.current.state.actionErrors).toBe(1);
    expect(result.current.state.averageReactionTimeMs).toBe(100);
    expect(completeSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'STROOP_ALPHABET',
      errors: 2,
      metadata: expect.objectContaining({
        mode: 'stroop-alphabet',
        colorErrors: 1,
        actionErrors: 1,
      }),
    }));
    unsubscribe();
  });

  it('marks an incomplete run as aborted without completion telemetry', () => {
    const completeSpy = vi.fn();
    const unsubscribe = eventBus.on('TRAINING_COMPLETE', completeSpy);
    const { result } = renderHook(() => useStroopAlphabetEngine());

    act(() => result.current.startGame(3, generateStroopAlphabetSet(3, 7)));
    perfTime += 250;
    act(() => result.current.stopGame());

    expect(result.current.state.outcome).toBe('aborted');
    expect(completeSpy).not.toHaveBeenCalled();
    unsubscribe();
  });
});
