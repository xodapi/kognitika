import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useNBackEngine } from '../hooks/useNBackEngine';
import { useStroopEngine } from '../hooks/useStroopEngine';

describe('N-Back and Stroop canonical cognitive events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    let perfTime = 1_000;
    vi.spyOn(performance, 'now').mockImplementation(() => perfTime += 100);
  });

  it('collects an ordered completed N-Back job', () => {
    const { result } = renderHook(() => useNBackEngine(2));
    act(() => result.current.startGame(42));

    for (let index = 0; index < 21; index += 1) {
      act(() => vi.runOnlyPendingTimers());
    }

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'nback', category: 'cognitive' });
    expect(job?.events[0]).toMatchObject({ kind: 'checkpoint', tMs: 0, sequence: 0 });
    expect(job?.events.at(-1)).toMatchObject({ kind: 'session_completed', tMs: 50_000 });
    expect(completedSessionJobToAnalyzeSessionInput(job).events.length).toBeGreaterThan(0);
  });

  it('collects a completed Stroop job with answer events', () => {
    const { result } = renderHook(() => useStroopEngine());
    act(() => result.current.startGame(42));

    const correctAnswerId = result.current.state.question!.correctAnswerId;
    act(() => result.current.answerQuestion(correctAnswerId));
    act(() => vi.advanceTimersByTime(61_000));

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'stroop', category: 'cognitive' });
    expect(job?.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'trial_started' }),
      expect.objectContaining({ kind: 'trial_answered', isCorrect: true }),
      expect.objectContaining({ kind: 'session_completed', tMs: 60_000 }),
    ]));
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(1);
  });
});
