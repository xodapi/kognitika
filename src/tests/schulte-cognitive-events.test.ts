import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completedSessionJobToAnalyzeSessionInput } from '../core/cognitive-events';
import { useSchulteEngine } from '../hooks/useSchulteEngine';

vi.mock('../lib/cognitive-metrics', () => ({
  getDifficultySuggestion: vi.fn().mockResolvedValue({
    nextGridSize: 5,
    noiseLevel: 0,
    rotationEnabled: false,
    message: 'Synthetic',
  }),
}));

describe('Schulte canonical cognitive events', () => {
  let perfTime = 1_000;

  beforeEach(() => {
    perfTime = 1_000;
    vi.spyOn(performance, 'now').mockImplementation(() => perfTime);
  });

  it('collects a non-empty privacy-safe completed session job', () => {
    const { result } = renderHook(() => useSchulteEngine(3, 'classic'));
    act(() => result.current.startGame(42));

    const sequence = [...result.current.state.expectedSequence];
    for (const expectedCell of sequence) {
      perfTime += 250;
      const cell = result.current.state.grid.find((candidate) => candidate.num === expectedCell.num)!;
      act(() => result.current.clickCell(cell, result.current.state.grid.indexOf(cell)));
    }

    const job = result.current.getCompletedAnalyticsJob();
    expect(job).toMatchObject({
      moduleId: 'schulte',
      category: 'cognitive',
      events: expect.arrayContaining([
        expect.objectContaining({ kind: 'trial_started', sequence: 0 }),
        expect.objectContaining({ kind: 'session_completed' }),
      ]),
    });
    expect(job?.events).toHaveLength(sequence.length + 2);
    expect(JSON.stringify(job)).not.toMatch(/brain.?id|user|email|token|password|storage|screenshot/i);

    const analysisInput = completedSessionJobToAnalyzeSessionInput(job);
    expect(analysisInput.events).toHaveLength(sequence.length);
    expect(analysisInput.events.every((event) => event.kind === 'click')).toBe(true);
  });
});
