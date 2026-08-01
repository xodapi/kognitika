import { describe, expect, it } from 'vitest';
import { LegacyCognitiveEventBridge } from '../core/cognitive-events';

const context = {
  sessionId: 'session-synthetic-schulte',
  moduleId: 'schulte' as const,
  moduleVersion: '2026.1',
  startedAt: '2026-01-02T00:00:00.000Z',
};

describe('legacy cognitive EventBus bridge', () => {
  it('converts supported Schulte clicks and completion without changing legacy payloads', () => {
    const bridge = new LegacyCognitiveEventBridge(context);

    expect(bridge.translate({
      legacyEventId: 'click-1',
      event: 'CELL_CLICK',
      tMs: 240,
      data: { num: 1, isCorrect: true, reactionTimeMs: 240, cellId: 4 },
    })).toMatchObject({
      kind: 'trial_answered',
      sequence: 0,
      tMs: 240,
      isCorrect: true,
      reactionTimeMs: 240,
    });

    expect(bridge.translate({
      legacyEventId: 'complete-1',
      event: 'TRAINING_COMPLETE',
      tMs: 1_200,
      data: { type: 'SCHULTE', timeMs: 1_200, score: 500 },
    })).toMatchObject({
      kind: 'session_completed',
      sequence: 1,
      completedAt: '2026-01-02T00:00:01.200Z',
    });
  });

  it('does not treat zero reaction time as a measurement', () => {
    const bridge = new LegacyCognitiveEventBridge({ ...context, moduleId: 'nback' });
    const event = bridge.translate({
      legacyEventId: 'click-nback-1',
      event: 'CELL_CLICK',
      tMs: 500,
      data: { num: 0, isCorrect: true, reactionTimeMs: 0 },
    });

    expect(event).toMatchObject({ kind: 'trial_answered', isCorrect: true });
    expect(event).not.toHaveProperty('reactionTimeMs');
  });

  it('rejects duplicate, terminal-race, unsupported, and sensitive legacy payloads', () => {
    const bridge = new LegacyCognitiveEventBridge(context);
    const click = {
      legacyEventId: 'click-1',
      event: 'CELL_CLICK' as const,
      tMs: 100,
      data: { num: 1, isCorrect: true, reactionTimeMs: 100 },
    };

    expect(bridge.translate(click)).not.toBeNull();
    expect(bridge.translate(click)).toBeNull();
    expect(bridge.translate({
      legacyEventId: 'out-of-order',
      event: 'CELL_CLICK',
      tMs: 99,
      data: { num: 2, isCorrect: false, reactionTimeMs: 100 },
    })).toBeNull();
    expect(bridge.translate({
      legacyEventId: 'sensitive-1',
      event: 'CELL_CLICK',
      tMs: 200,
      data: { num: 2, isCorrect: false, reactionTimeMs: 100, token: 'synthetic-token' },
    })).toBeNull();
    expect(bridge.translate({
      legacyEventId: 'wrong-terminal',
      event: 'TRAINING_COMPLETE',
      tMs: 300,
      data: { type: 'NBACK', timeMs: 300 },
    })).toBeNull();
    expect(bridge.translate({
      legacyEventId: 'wrong-terminal',
      event: 'TRAINING_COMPLETE',
      tMs: 300,
      data: { type: 'NBACK', timeMs: 300 },
    })).toBeNull();
    expect(bridge.translate({
      legacyEventId: 'completed',
      event: 'TRAINING_COMPLETE',
      tMs: 400,
      data: { type: 'SCHULTE', timeMs: 400 },
    })).not.toBeNull();
    expect(bridge.translate({
      legacyEventId: 'after-terminal',
      event: 'CELL_CLICK',
      tMs: 450,
      data: { num: 2, isCorrect: true, reactionTimeMs: 50 },
    })).toBeNull();
  });
});
