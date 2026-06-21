import { describe, expect, it } from 'vitest';
import {
  parsePracticeFlowEvent,
  summarizePracticeFlowEvents,
  type PracticeFlowEvent,
} from '../lib/practice-flow-analytics';

const base = {
  category: 'cognitive',
  moduleId: 'schulte',
  route: '/schulte',
  buildId: 'test-build',
  storageSchemaVersion: '1',
  anonymousSessionId: 'anon-synthetic-session',
} as const;

function at(seconds: number) {
  return new Date(Date.UTC(2026, 0, 1, 0, 0, seconds)).toISOString();
}

describe('practice flow analytics contract', () => {
  it('accepts privacy-safe flow events and rejects identity material', () => {
    expect(parsePracticeFlowEvent({
      event: 'PracticeStarted',
      ...base,
      checkpoint: 'route_loaded',
      timestamp: at(1),
    }).success).toBe(true);

    expect(parsePracticeFlowEvent({
      event: 'PracticeStarted',
      ...base,
      checkpoint: 'route_loaded',
      timestamp: at(1),
      token: 'synthetic-token',
    }).success).toBe(false);

    expect(parsePracticeFlowEvent({
      event: 'PracticeStarted',
      ...base,
      checkpoint: 'route_loaded',
      timestamp: at(1),
      user: { email: 'synthetic@example.test' },
    }).success).toBe(false);
  });

  it('summarizes drop-off checkpoints and recommendation conversion', () => {
    const events: PracticeFlowEvent[] = [
      {
        event: 'PracticeRecommended',
        ...base,
        moduleId: 'stroop',
        reason: 'variety',
        sourceSessionId: 'local-schulte',
        timestamp: at(1),
      },
      {
        event: 'PracticeStarted',
        ...base,
        moduleId: 'stroop',
        route: '/stroop',
        checkpoint: 'route_loaded',
        timestamp: at(2),
      },
      {
        event: 'PracticeStepViewed',
        ...base,
        moduleId: 'stroop',
        route: '/stroop',
        checkpoint: 'engaged_15s',
        timestamp: at(17),
      },
      {
        event: 'PracticeCompleted',
        ...base,
        moduleId: 'stroop',
        route: '/stroop',
        checkpoint: 'completed',
        durationMs: 20_000,
        timestamp: at(22),
      },
      {
        event: 'PracticeStarted',
        ...base,
        moduleId: 'numerical',
        route: '/numerical',
        checkpoint: 'route_loaded',
        timestamp: at(30),
      },
      {
        event: 'PracticeAbandoned',
        ...base,
        moduleId: 'numerical',
        route: '/numerical',
        lastCheckpoint: 'route_loaded',
        reason: 'route_change',
        durationMs: 4_000,
        timestamp: at(34),
      },
    ];

    const summary = summarizePracticeFlowEvents(events);

    expect(summary.totalEvents).toBe(events.length);
    expect(summary.recommendationConversion).toMatchObject({
      shown: 1,
      converted: 1,
      conversionRate: 1,
      continuationStarts: 1,
    });
    expect(summary.dropOffByModuleAndCheckpoint).toEqual([
      { moduleId: 'numerical', checkpoint: 'route_loaded', abandoned: 1 },
    ]);
    expect(summary.byModule.find((item) => item.moduleId === 'numerical')).toMatchObject({
      started: 1,
      abandoned: 1,
      abandonmentRate: 1,
    });
  });
});
