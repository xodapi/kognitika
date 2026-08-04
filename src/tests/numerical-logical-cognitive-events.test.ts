import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useLogicalEngine } from '../hooks/useLogicalEngine';
import { useNumericalEngine } from '../hooks/useNumericalEngine';

describe('Numerical and logical canonical cognitive events', () => {
  beforeEach(() => {
    let perfTime = 1_000;
    vi.spyOn(performance, 'now').mockImplementation(() => perfTime += 100);
  });

  it('collects a completed Numerical session job', () => {
    const { result } = renderHook(() => useNumericalEngine());
    act(() => result.current.startGame(42));

    for (let index = 0; index < 5; index += 1) {
      const answer = result.current.state.questions[index].correctAnswer;
      act(() => result.current.answerQuestion(answer));
    }

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'numerical', category: 'cognitive' });
    expect(job?.events.at(-1)).toMatchObject({ kind: 'session_completed' });
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(5);
  });

  it('collects a completed Logical session job', () => {
    const { result } = renderHook(() => useLogicalEngine());
    act(() => result.current.startGame(42));

    for (let index = 0; index < 3; index += 1) {
      const answer = result.current.state.questions[index].correctOptionIndex;
      act(() => result.current.answerQuestion(answer));
    }

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'logical-sequence', category: 'cognitive' });
    expect(job?.events.at(-1)).toMatchObject({ kind: 'session_completed' });
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(3);
  });
});
