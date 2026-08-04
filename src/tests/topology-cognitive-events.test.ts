import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useTopologyEngine } from '../hooks/useTopologyEngine';

describe('Topology canonical cognitive events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('collects a completed topology session without graph labels or descriptions', () => {
    const { result } = renderHook(() => useTopologyEngine());
    act(() => result.current.startGame(1));
    const node = result.current.state.nodes[0]!;
    act(() => result.current.setNodeAnswer(node.id, 'active'));
    act(() => result.current.submitAnswers());

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'topology', category: 'cognitive' });
    expect(job?.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'trial_started', trialType: 'topology:state-recall' }),
      expect.objectContaining({ kind: 'trial_answered' }),
      expect.objectContaining({ kind: 'session_completed' }),
    ]));
    expect(JSON.stringify(job)).not.toMatch(/узел|критическ|обработк/i);
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(1);
  });
});
