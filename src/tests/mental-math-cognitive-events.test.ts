import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useMentalMathEngine } from '../hooks/useMentalMathEngine';

describe('Mental Math canonical cognitive events', () => {
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

  it('collects a completed job with minimized answer events', () => {
    const { result } = renderHook(() => useMentalMathEngine());
    act(() => result.current.startGame(1, 2, undefined, 42));

    for (let index = 0; index < 2; index += 1) {
      perfTime += 500;
      act(() => result.current.submitAnswer(result.current.state.questions[index].answer));
    }

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'mental-math', category: 'cognitive' });
    expect(job?.events.at(-1)).toMatchObject({ kind: 'session_completed' });
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(2);
  });
});
