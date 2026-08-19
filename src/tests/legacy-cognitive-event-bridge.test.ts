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

  it('maps only complete, strict Schulte 90 legacy payloads', () => {
    const bridge = new LegacyCognitiveEventBridge({ ...context, moduleId: 'schulte-90' });

    const click = bridge.translate({
      legacyEventId: 'schulte-90-click',
      event: 'CELL_CLICK',
      tMs: 0,
      data: { num: 1, color: 'black', cellId: 4, gridIndex: 4, x: 0.5, y: 0.5, isCorrect: true, reactionTimeMs: 0 },
    });
    expect(click).toMatchObject({
      kind: 'trial_answered',
      moduleId: 'schulte-90',
      trialType: 'schulte-90:trial',
      tMs: 0,
      isCorrect: true,
    });
    expect(click).not.toHaveProperty('reactionTimeMs');
    expect(click).not.toHaveProperty('color');
    expect(click).not.toHaveProperty('cellId');

    const completion = bridge.translate({
      legacyEventId: 'schulte-90-complete',
      event: 'TRAINING_COMPLETE',
      tMs: 60_000,
      data: {
        type: 'SCHULTE_90',
        timeMs: 60_000,
        accuracy: 90,
        score: 500,
        errors: 10,
        metadata: { rule: 'black-red', rows: 9, cols: 10, size: 10, totalQuestions: 90 },
      },
    });
    expect(completion).toMatchObject({
      kind: 'session_completed',
      moduleId: 'schulte-90',
      completedAt: '2026-01-02T00:01:00.000Z',
    });
    expect(completion).not.toHaveProperty('accuracy');
    expect(completion).not.toHaveProperty('score');
    expect(completion).not.toHaveProperty('errors');
    expect(completion).not.toHaveProperty('metadata');
  });

  it('rejects anomalous, mismatched, and incomplete Schulte 90 payloads', () => {
    const valid = {
      type: 'SCHULTE_90',
      timeMs: 60_000,
      accuracy: 90,
      score: 500,
      errors: 10,
      metadata: { rule: 'classic', rows: 9, cols: 10, size: 10, totalQuestions: 90 },
    };
    const invalidPayloads = [
      { ...valid, type: 'SCHULTE' },
      { ...valid, timeMs: 60_001 },
      { ...valid, accuracy: Number.NaN },
      { ...valid, accuracy: 100.1 },
      { ...valid, score: 10.5 },
      { ...valid, score: 1_001 },
      { ...valid, errors: -1 },
      { ...valid, errors: 1.5 },
      { ...valid, metadata: { ...valid.metadata, rule: 'unexpected' } },
      { ...valid, metadata: { ...valid.metadata, rows: 8 } },
      { ...valid, metadata: { rule: 'classic', rows: 9, cols: 10, size: 10 } },
      { ...valid, metadata: { ...valid.metadata, extra: true } },
      { ...valid, reason: 'middleware' },
      { ...valid, anomalous: true },
    ];

    for (const [index, data] of invalidPayloads.entries()) {
      const bridge = new LegacyCognitiveEventBridge({ ...context, moduleId: 'schulte-90' });
      expect(bridge.translate({
        legacyEventId: `invalid-schulte-90-${index}`,
        event: 'TRAINING_COMPLETE',
        tMs: 60_000,
        data,
      })).toBeNull();
    }

    const wrongModuleBridge = new LegacyCognitiveEventBridge({ ...context, moduleId: 'schulte' });
    expect(wrongModuleBridge.translate({
      legacyEventId: 'schulte-90-wrong-module',
      event: 'TRAINING_COMPLETE',
      tMs: 60_000,
      data: valid,
    })).toBeNull();
    const bridge = new LegacyCognitiveEventBridge({ ...context, moduleId: 'schulte-90' });
    expect(bridge.translate({
      legacyEventId: 'schulte-90-click-extra',
      event: 'CELL_CLICK',
      tMs: 60_000,
      data: { num: 1, color: 'black', isCorrect: true, anomalous: true },
    })).toBeNull();
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

  it('converts privacy-safe Stroop clicks and strict completion metadata', () => {
    const bridge = new LegacyCognitiveEventBridge({ ...context, moduleId: 'stroop' });

    expect(bridge.translate({
      legacyEventId: 'stroop-click-1',
      event: 'CELL_CLICK',
      tMs: 240,
      data: {
        num: 0,
        isCorrect: true,
        reactionTimeMs: 240,
        stimulus: 'RED',
        answer: 'blue',
        score: 10,
        errors: 1,
        level: 1,
      },
    })).toBeNull();

    const click = bridge.translate({
      legacyEventId: 'stroop-click-2',
      event: 'CELL_CLICK',
      tMs: 240,
      data: { num: 0, isCorrect: true, reactionTimeMs: 240 },
    });
    expect(click).toEqual(expect.objectContaining({
      kind: 'trial_answered',
      moduleId: 'stroop',
      sequence: 0,
      tMs: 240,
      isCorrect: true,
      reactionTimeMs: 240,
    }));
    expect(click).not.toHaveProperty('num');
    expect(click).not.toHaveProperty('stimulus');
    expect(click).not.toHaveProperty('answer');
    expect(click).not.toHaveProperty('score');
    expect(click).not.toHaveProperty('errors');
    expect(click).not.toHaveProperty('level');

    const completion = bridge.translate({
      legacyEventId: 'stroop-complete-1',
      event: 'TRAINING_COMPLETE',
      tMs: 60_000,
      data: {
        type: 'STROOP',
        timeMs: 60_000,
        score: 10,
        errors: 1,
        level: 1,
        metadata: { avgReactionTime: 240 },
      },
    });
    expect(completion).toMatchObject({
      kind: 'session_completed',
      moduleId: 'stroop',
      sequence: 1,
      completedAt: '2026-01-02T00:01:00.000Z',
    });
    expect(completion).not.toHaveProperty('metadata');
  });

  it('rejects invalid Stroop completion metadata and timing mismatches', () => {
    const invalidPayloads = [
      { type: 'STROOP', timeMs: 60_000 },
      { type: 'STROOP', timeMs: 60_000, metadata: {} },
      { type: 'STROOP', timeMs: 60_000, metadata: { avgReactionTime: '240' } },
      { type: 'STROOP', timeMs: 60_000, metadata: { avgReactionTime: Number.NaN } },
      { type: 'STROOP', timeMs: 60_000, metadata: { avgReactionTime: 240, score: 10 } },
      {
        type: 'STROOP',
        timeMs: 60_000,
        score: 10,
        errors: 1,
        level: 1,
        metadata: { avgReactionTime: 240, unexpected: true },
      },
    ];

    for (const [index, data] of invalidPayloads.entries()) {
      const bridge = new LegacyCognitiveEventBridge({ ...context, moduleId: 'stroop' });
      expect(bridge.translate({
        legacyEventId: `invalid-stroop-${index}`,
        event: 'TRAINING_COMPLETE',
        tMs: 60_000,
        data,
      })).toBeNull();
    }

    const bridge = new LegacyCognitiveEventBridge({ ...context, moduleId: 'stroop' });
    expect(bridge.translate({
      legacyEventId: 'stroop-time-mismatch',
      event: 'TRAINING_COMPLETE',
      tMs: 60_000,
      data: {
        type: 'STROOP',
        timeMs: 59_999,
        score: 10,
        errors: 1,
        level: 1,
        metadata: { avgReactionTime: 240 },
      },
    })).toBeNull();
  });

  it('omits zero and fractional Stroop reaction times and rejects post-terminal events', () => {
    const bridge = new LegacyCognitiveEventBridge({ ...context, moduleId: 'stroop' });

    for (const [legacyEventId, reactionTimeMs] of [
      ['stroop-zero', 0],
      ['stroop-fractional', 10.5],
    ] as const) {
      const event = bridge.translate({
        legacyEventId,
        event: 'CELL_CLICK',
        tMs: 100,
        data: { num: 0, isCorrect: true, reactionTimeMs },
      });
      expect(event).toMatchObject({ kind: 'trial_answered', moduleId: 'stroop' });
      expect(event).not.toHaveProperty('reactionTimeMs');
    }

    expect(bridge.translate({
      legacyEventId: 'stroop-completed',
      event: 'TRAINING_COMPLETE',
      tMs: 60_000,
      data: {
        type: 'STROOP',
        timeMs: 60_000,
        score: 10,
        errors: 1,
        level: 1,
        metadata: { avgReactionTime: 240 },
      },
    })).not.toBeNull();
    expect(bridge.translate({
      legacyEventId: 'stroop-after-terminal',
      event: 'CELL_CLICK',
      tMs: 60_001,
      data: { num: 0, isCorrect: true, reactionTimeMs: 10 },
    })).toBeNull();
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
