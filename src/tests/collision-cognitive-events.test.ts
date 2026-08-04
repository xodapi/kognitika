import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useCollisionEngine } from '../hooks/useCollisionEngine';

describe('Collision canonical cognitive events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000));
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('collects generic correctness without rule or card text', () => {
    const { result } = renderHook(() => useCollisionEngine());
    act(() => result.current.startGame(1));
    act(() => vi.advanceTimersByTime(4_000));

    const activeCard = result.current.state.activeCard;
    expect(activeCard).not.toBeNull();
    act(() => result.current.flagCard(activeCard!));
    for (let index = 0; index < 30 && !result.current.state.isFinished; index += 1) {
      act(() => vi.advanceTimersByTime(3_001));
    }

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'collision', category: 'cognitive' });
    expect(job?.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'trial_started' }),
      expect.objectContaining({ kind: 'trial_answered', isCorrect: activeCard?.isViolation }),
      expect.objectContaining({ kind: 'session_completed' }),
    ]));
    expect(job?.events.filter((event) => event.kind === 'session_completed')).toHaveLength(1);
    expect(JSON.stringify(job)).not.toContain(activeCard!.text);
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(1);
  });
});
