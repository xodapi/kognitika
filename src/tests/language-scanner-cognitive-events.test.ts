import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useLanguageScannerEngine } from '../hooks/useLanguageScannerEngine';

vi.mock('../lib/cognitive-metrics', () => ({
  getSemanticConsistency: vi.fn(async () => ({ cognitiveVigilance: 0.9, detectionAccuracy: 0.9 })),
}));

describe('Language Scanner canonical cognitive events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000));
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('collects generic rule-selection correctness without content text', () => {
    const { result } = renderHook(() => useLanguageScannerEngine());
    act(() => result.current.startGame(1, 123));
    act(() => result.current.startScan());
    act(() => vi.advanceTimersByTime(0));

    const activeCard = result.current.state.activeCard;
    expect(activeCard).not.toBeNull();
    act(() => result.current.flagCard(activeCard!.ruleRef ?? -1));

    for (let index = 0; index < 30 && !result.current.state.isFinished; index += 1) {
      act(() => result.current.skipCard());
      act(() => vi.advanceTimersByTime(0));
    }

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({ moduleId: 'language-scanner', category: 'cognitive' });
    expect(job?.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'trial_started' }),
      expect.objectContaining({ kind: 'trial_answered' }),
      expect.objectContaining({ kind: 'session_completed' }),
    ]));
    expect(JSON.stringify(job)).not.toContain(activeCard!.text);
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(1);
  });
});
