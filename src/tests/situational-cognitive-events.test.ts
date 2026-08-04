import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useSituationalEngine } from '../hooks/useSituationalEngine';

describe('Situational canonical cognitive events', () => {
  let perfTime = 1_000;

  beforeEach(() => {
    perfTime = 1_000;
    vi.spyOn(performance, 'now').mockImplementation(() => perfTime);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('collects minimized judgment correctness through completion', () => {
    const { result } = renderHook(() => useSituationalEngine());
    act(() => result.current.startGame());

    for (const question of result.current.state.questions) {
      perfTime += 100;
      act(() => result.current.answerQuestion(Math.max(...question.options.map((option) => option.score))));
    }

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'situational', category: 'cognitive' });
    expect(job?.events.filter((event) => event.kind === 'trial_answered')).toHaveLength(3);
    expect(job?.events.at(-1)).toMatchObject({ kind: 'session_completed' });
    expect(JSON.stringify(job)).not.toMatch(/сотрудник|конкурент|клиент/i);
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(3);
  });
});
