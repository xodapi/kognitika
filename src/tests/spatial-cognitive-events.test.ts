import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useSpatialEngine } from '../hooks/useSpatialEngine';

describe('Spatial canonical cognitive events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
  });

  it('collects a completed job after an incorrect recall selection', () => {
    const { result } = renderHook(() => useSpatialEngine());
    act(() => result.current.startTraining());
    act(() => vi.advanceTimersByTime(5_000));

    const emptyCell = result.current.state.grid.find((cell) => !cell.isActive)!;
    act(() => result.current.handleCellClick(emptyCell.id));

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'spatial', category: 'cognitive' });
    expect(job?.events.at(-1)).toMatchObject({ kind: 'session_completed' });
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(1);
  });
});
