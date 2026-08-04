import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useSchulte90Engine } from '../hooks/useSchulte90Engine';

describe('Schulte 90 canonical cognitive events', () => {
  beforeEach(() => {
    vi.spyOn(performance, 'now').mockReturnValue(1_000);
  });

  it('collects minimized cell correctness through successful completion', () => {
    const { result } = renderHook(() => useSchulte90Engine());
    act(() => result.current.startGame(42));

    for (let index = 0; index < 90; index += 1) {
      const expected = result.current.state.expectedSequence[index]!;
      const cell = result.current.state.grid.find((candidate) => candidate.num === expected.num)!;
      act(() => result.current.clickCell(cell, result.current.state.grid.indexOf(cell)));
    }

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'schulte-90', category: 'cognitive' });
    expect(job?.events.at(-1)).toMatchObject({ kind: 'session_completed' });
    expect(job?.events.filter((event) => event.kind === 'trial_answered')).toHaveLength(90);
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(90);
  });
});
