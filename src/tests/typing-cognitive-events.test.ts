import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useTypingEngine } from '../hooks/useTypingEngine';

vi.mock('../lib/cognitive-metrics', () => ({
  getTypingStats: vi.fn().mockResolvedValue({ cpm: 60, wpm: 12, accuracy: 100, errors: 0 }),
}));

describe('Typing canonical cognitive events', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_500);
  });

  it('collects a completed typing job without text content', async () => {
    const { result } = renderHook(() => useTypingEngine(['Synthetic text']));
    act(() => result.current.startTest());

    await act(async () => {
      await result.current.handleInput('Synthetic text');
    });

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'typing', category: 'cognitive' });
    expect(job?.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'trial_started' }),
      expect.objectContaining({ kind: 'trial_answered' }),
      expect.objectContaining({ kind: 'session_completed' }),
    ]));
    expect(JSON.stringify(job)).not.toContain('Synthetic text');
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(1);
  });
});
