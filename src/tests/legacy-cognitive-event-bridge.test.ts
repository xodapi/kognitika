import { describe, expect, it } from 'vitest';
import { LegacyCognitiveEventBridge } from '../core/cognitive-events';

const context = {
  sessionId: 'session-synthetic-schulte',
  moduleId: 'schulte' as const,
  moduleVersion: '2026.1',
  startedAt: '2026-01-02T00:00:00.000Z',
};

describe('legacy cognitive EventBus bridge', () => {
  it('converts supported Schulte clicks and completion into canonical events', () => {
    const bridge = new LegacyCognitiveEventBridge(context);

    expect(bridge.translate({
      legacyEventId: 'click-1',
      event: 'CELL_CLICK',
      tMs: 240,
      data: { num: 1, isCorrect: true, reactionTimeMs: 240, cellId: 4, x: 0.5, y: 0.5 },
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

  it('converts logical clicks and completion while omitting zero reaction time', () => {
    const bridge = new LegacyCognitiveEventBridge({ ...context, moduleId: 'logical' });

    const click = bridge.translate({
      legacyEventId: 'logical-click-1',
      event: 'CELL_CLICK',
      tMs: 500,
      data: { num: 0, isCorrect: true, reactionTimeMs: 0 },
    });
    expect(click).toMatchObject({
      kind: 'trial_answered',
      moduleId: 'logical',
      sequence: 0,
      tMs: 500,
      isCorrect: true,
    });
    expect(click).not.toHaveProperty('reactionTimeMs');

    expect(bridge.translate({
      legacyEventId: 'logical-complete-1',
      event: 'TRAINING_COMPLETE',
      tMs: 1_200,
      data: { type: 'LOGICAL_SEQUENCE', timeMs: 1_200 },
    })).toMatchObject({
      kind: 'session_completed',
      moduleId: 'logical',
      sequence: 1,
      completedAt: '2026-01-02T00:00:01.200Z',
    });
  });

  it('supports Numerical and N-back representative legacy completions', () => {
    const numerical = new LegacyCognitiveEventBridge({ ...context, moduleId: 'numerical' });
    const nback = new LegacyCognitiveEventBridge({ ...context, moduleId: 'nback' });

    expect(numerical.translate({
      legacyEventId: 'numerical-complete',
      event: 'TRAINING_COMPLETE',
      tMs: 700,
      data: { type: 'NUMERICAL_ANALYSIS', timeMs: 700, score: 3, errors: 1, level: 1 },
    })).toMatchObject({ kind: 'session_completed', moduleId: 'numerical', tMs: 700 });
    expect(nback.translate({
      legacyEventId: 'nback-complete',
      event: 'TRAINING_COMPLETE',
      tMs: 900,
      data: { type: 'NBACK', timeMs: 900, score: 2, errors: 1, level: 2 },
    })).toMatchObject({ kind: 'session_completed', moduleId: 'nback', tMs: 900 });
  });

  it('keeps missing and incomplete reaction measurements absent', () => {
    const bridge = new LegacyCognitiveEventBridge(context);

    for (const [legacyEventId, reactionTimeMs] of [
      ['missing-reaction', undefined],
      ['fractional-reaction', 10.5],
      ['negative-reaction', -1],
    ] as const) {
      const event = bridge.translate({
        legacyEventId,
        event: 'CELL_CLICK',
        tMs: 100,
        data: { num: 1, isCorrect: true, ...(reactionTimeMs === undefined ? {} : { reactionTimeMs }) },
      });
      expect(event).toMatchObject({ kind: 'trial_answered', tMs: 100 });
      expect(event).not.toHaveProperty('reactionTimeMs');
    }
  });

  it('emits one terminal abandonment event', () => {
    const bridge = new LegacyCognitiveEventBridge(context);
    expect(bridge.translate({
      legacyEventId: 'abandoned',
      event: 'TRAINING_ABANDONED',
      tMs: 300,
      data: { reason: 'timeout', lastCheckpoint: 'round:3' },
    })).toMatchObject({
      kind: 'session_abandoned',
      reason: 'timeout',
      lastCheckpoint: 'round:3',
      sequence: 0,
    });
    expect(bridge.translate({
      legacyEventId: 'completed-after-abandonment',
      event: 'TRAINING_COMPLETE',
      tMs: 400,
      data: { type: 'SCHULTE', timeMs: 400 },
    })).toBeNull();
  });

  it('rejects duplicate, out-of-order, terminal-race, unsupported, and private payloads', () => {
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
      legacyEventId: 'free-text',
      event: 'CELL_CLICK',
      tMs: 200,
      data: { num: 2, isCorrect: false, reactionTimeMs: 100, note: 'private text' },
    })).toBeNull();
    expect(bridge.translate({
      legacyEventId: 'raw-storage',
      event: 'TRAINING_COMPLETE',
      tMs: 250,
      data: { type: 'SCHULTE', timeMs: 250, metadata: { screenshot: 'data:image/png' } },
    })).toBeNull();
    expect(bridge.translate({
      legacyEventId: 'identity',
      event: 'CELL_CLICK',
      tMs: 250,
      data: { num: 2, isCorrect: false, userId: 'user-1' },
    })).toBeNull();
    expect(bridge.translate({
      legacyEventId: 'screenshot',
      event: 'CELL_CLICK',
      tMs: 250,
      data: { num: 2, isCorrect: false, screenshot: 'data:image/png' },
    })).toBeNull();
    expect(bridge.translate({
      legacyEventId: 'mismatched-time',
      event: 'TRAINING_COMPLETE',
      tMs: 275,
      data: { type: 'SCHULTE', timeMs: 274 },
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
