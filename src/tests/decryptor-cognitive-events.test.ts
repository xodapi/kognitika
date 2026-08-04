import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useDecryptorEngine } from '../hooks/useDecryptorEngine';

describe('Decryptor canonical cognitive events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('collects selection correctness without fact or card content', () => {
    const { result } = renderHook(() => useDecryptorEngine());
    act(() => result.current.startGame(1));
    act(() => vi.advanceTimersByTime(10_000));

    const activeCard = result.current.state.activeCard;
    expect(activeCard).not.toBeNull();
    act(() => result.current.handleAnswer('synthetic-wrong-answer'));
    act(() => vi.advanceTimersByTime(60_000));

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'decryptor', category: 'cognitive' });
    expect(job?.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'trial_started' }),
      expect.objectContaining({ kind: 'trial_answered', isCorrect: false }),
      expect.objectContaining({ kind: 'session_completed' }),
    ]));
    expect(JSON.stringify(job)).not.toContain(activeCard!.text);
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(1);
  });
});
