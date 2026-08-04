import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useAlphabetTableEngine } from '../hooks/useAlphabetTableEngine';
import { useStroopAlphabetEngine } from '../hooks/useStroopAlphabetEngine';
import { generateAlphabetTable } from '../lib/alphabet-table-generator';
import { generateStroopAlphabetSet } from '../lib/stroop-alphabet-generator';

describe('alphabet trainer canonical cognitive events', () => {
  let perfTime = 1_000;

  beforeEach(() => {
    perfTime = 1_000;
    vi.spyOn(performance, 'now').mockImplementation(() => perfTime);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('collects color and action correctness for a completed Stroop Alphabet session', () => {
    const set = generateStroopAlphabetSet(3, 42);
    const { result } = renderHook(() => useStroopAlphabetEngine());
    act(() => result.current.startGame(3, set));

    for (const item of set.items) {
      perfTime += 100;
      act(() => result.current.submitColor(item.wordColorId));
      perfTime += 100;
      act(() => result.current.submitAction(item.action));
    }

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'stroop-alphabet', category: 'cognitive' });
    expect(job?.events.filter((event) => event.kind === 'trial_answered')).toHaveLength(6);
    expect(job?.events.at(-1)).toMatchObject({ kind: 'session_completed' });
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(6);
  });

  it('collects action correctness for a completed Alphabet Table session', () => {
    const set = generateAlphabetTable(9, 'balanced', 42);
    const { result } = renderHook(() => useAlphabetTableEngine());
    act(() => result.current.startGame('balanced', 9, set));

    for (const item of set.items) {
      perfTime += 100;
      act(() => result.current.submitAction(item.action));
    }

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'alphabet-table', category: 'cognitive' });
    expect(job?.events.filter((event) => event.kind === 'trial_answered')).toHaveLength(9);
    expect(job?.events.at(-1)).toMatchObject({ kind: 'session_completed' });
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(9);
  });
});
