import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useDispatcherEngine } from '../hooks/useDispatcherEngine';

describe('Dispatcher canonical cognitive events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000));
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('collects minimized stream responses and one completed session job', () => {
    const { result } = renderHook(() => useDispatcherEngine());
    act(() => result.current.startGame(1));

    act(() => result.current.triggerStream(0));
    act(() => vi.advanceTimersByTime(45_000));

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'dispatcher', category: 'cognitive' });
    expect(job?.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'trial_started' }),
      expect.objectContaining({ kind: 'trial_answered', isCorrect: false }),
      expect.objectContaining({ kind: 'session_completed' }),
    ]));
    expect(job?.events.filter((event) => event.kind === 'session_completed')).toHaveLength(1);
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(1);
  });
});
