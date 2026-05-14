import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus } from '../lib/event-bus';
import { HeadlessRunner } from '../lib/headless-runner';

vi.mock('../lib/cognitive-metrics', () => ({
  getDifficultySuggestion: vi.fn().mockResolvedValue({
    nextGridSize: 5,
    noiseLevel: 0,
    rotationEnabled: false,
    message: 'Test Suggestion'
  }),
  analyzeSession: vi.fn()
}));

// Sample recorded session (truncated for test)
const MOCK_SESSION_LOG = [
  { timestamp: 100, event: 'CELL_CLICK', data: { num: 1, color: 'black', cellId: 0, gridIndex: 0, reactionTimeMs: 100, isCorrect: true } },
  { timestamp: 500, event: 'CELL_CLICK', data: { num: 2, color: 'black', cellId: 1, gridIndex: 1, reactionTimeMs: 400, isCorrect: true } },
  { timestamp: 1000, event: 'CELL_CLICK', data: { num: 3, color: 'black', cellId: 2, gridIndex: 2, reactionTimeMs: 500, isCorrect: true } },
  { timestamp: 1200, event: 'TRAINING_COMPLETE', data: { type: 'SCHULTE', timeMs: 1200, accuracy: 100, score: 500 } }
];

describe('Analytical Reproducibility (Headless)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process a recorded session and reach expected final state', () => {
    const completeHandler = vi.fn();
    eventBus.on('TRAINING_COMPLETE', completeHandler);

    const runner = new HeadlessRunner(MOCK_SESSION_LOG as any);
    runner.replaySync();

    expect(completeHandler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SCHULTE',
      score: 500
    }));
  });

  it('should trigger analytical sinks on cell clicks during replay', () => {
    const clickHandler = vi.fn();
    eventBus.on('CELL_CLICK', clickHandler);

    const runner = new HeadlessRunner(MOCK_SESSION_LOG as any);
    runner.replaySync();

    expect(clickHandler).toHaveBeenCalledTimes(3);
    expect(clickHandler).toHaveBeenLastCalledWith(expect.objectContaining({
      num: 3
    }));
  });
});
