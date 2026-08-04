import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useRealityCheckEngine } from '../hooks/useRealityCheckEngine';

vi.mock('../lib/cognitive-metrics', () => ({
  getSemanticConsistency: vi.fn(async () => ({ detectionAccuracy: 0.9, cognitiveVigilance: 0.8 })),
}));

describe('Reality Check canonical cognitive events', () => {
  it('collects classification correctness without statements or facts', async () => {
    const { result } = renderHook(() => useRealityCheckEngine(1, 1));
    act(() => result.current.startSession());

    const answerCount = result.current.pairsRemaining;
    for (let index = 0; index < answerCount; index += 1) {
      const pair = result.current.currentPair!;
      act(() => result.current.submitAnswer(pair.isHallucination));
    }
    await Promise.resolve();

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'reality-check', category: 'cognitive' });
    expect(job?.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'trial_started' }),
      expect.objectContaining({ kind: 'trial_answered' }),
      expect.objectContaining({ kind: 'session_completed' }),
    ]));
    expect(JSON.stringify(job)).not.toContain('В контексте указано общее состояние системы.');
    expect(completedSessionJobToAnalyzeSessionInput(job).events.length).toBeGreaterThan(0);
  });
});
