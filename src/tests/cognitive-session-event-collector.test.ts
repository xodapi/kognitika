import { describe, expect, it } from 'vitest';
import {
  CognitiveSessionEventCollector,
  completedSessionJobToAnalyzeSessionInput,
} from '../core/cognitive-events';

function createCollector() {
  return new CognitiveSessionEventCollector({
    sessionId: 'session-synthetic-nback',
    moduleId: 'nback',
    moduleVersion: '2026.1',
    category: 'cognitive',
    startedAt: '2026-01-02T00:00:00.000Z',
  });
}

describe('cognitive session event collector', () => {
  it('creates a deterministic privacy-safe completed job that can feed AnalyzeSession shadowing', () => {
    const collector = createCollector();
    collector.record({ kind: 'trial_started', tMs: 0, trialType: 'nback:trial' });
    collector.record({
      kind: 'trial_answered',
      tMs: 500,
      trialType: 'nback:trial',
      isCorrect: true,
      reactionTimeMs: 500,
    });
    collector.record({ kind: 'checkpoint', tMs: 700, checkpoint: 'halfway' });
    collector.complete(1_000, '2026-01-02T00:00:01.000Z');

    const job = collector.createCompletedJob('2026-01-02T00:00:02.000Z');
    expect(job).toMatchObject({
      jobId: 'analytics-job-session-synthetic-nback',
      completedAt: '2026-01-02T00:00:01.000Z',
      events: expect.arrayContaining([
        expect.objectContaining({ sequence: 0, kind: 'trial_started' }),
        expect.objectContaining({ sequence: 3, kind: 'session_completed' }),
      ]),
    });
    expect(JSON.stringify(job)).not.toMatch(/brainId|token|email|password|localStorage|rawStorage/i);
    expect(completedSessionJobToAnalyzeSessionInput(job).events).toHaveLength(2);
  });

  it('rejects sensitive, out-of-order, and terminal-race records', () => {
    const collector = createCollector();
    collector.record({ kind: 'trial_started', tMs: 100, trialType: 'nback:trial' });

    expect(() => collector.record({
      kind: 'trial_answered',
      tMs: 50,
      trialType: 'nback:trial',
      isCorrect: true,
    })).toThrow(/monotonic/);
    expect(() => collector.record({
      kind: 'trial_answered',
      tMs: 200,
      trialType: 'nback:trial',
      isCorrect: true,
      token: 'synthetic-token',
    } as never)).toThrow(/sensitive/);

    collector.abandon(300, 'user_exit', 'halfway');
    expect(() => collector.complete(400, '2026-01-02T00:00:00.400Z')).toThrow(/termination/);
    expect(() => collector.createCompletedJob('2026-01-02T00:00:01.000Z')).toThrow(/Only a completed session/);
  });
});
