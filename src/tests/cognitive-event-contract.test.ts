import { describe, expect, it } from 'vitest';
import {
  CompletedSessionAnalyticsJobSchema,
  assertCognitiveModuleCoverage,
  completedSessionJobToAnalyzeSessionInput,
  parseCompletedSessionAnalyticsJob,
} from '../core/cognitive-events';

const base = {
  schemaVersion: 1,
  sessionId: 'session-synthetic-schulte',
  moduleId: 'schulte',
  moduleVersion: '2026.1',
  category: 'cognitive',
} as const;

const validJob = {
  jobId: 'analytics-job-synthetic-schulte',
  analyzerVersion: 'analyze-session-v1',
  receivedAt: '2026-01-02T00:01:00.000Z',
  ...base,
  startedAt: '2026-01-02T00:00:00.000Z',
  completedAt: '2026-01-02T00:00:02.000Z',
  events: [
    {
      ...base,
      eventId: 'event-start',
      sequence: 0,
      tMs: 0,
      kind: 'trial_started',
      trialType: 'schulte:cell',
    },
    {
      ...base,
      eventId: 'event-answer',
      sequence: 1,
      tMs: 750,
      kind: 'trial_answered',
      trialType: 'schulte:cell',
      isCorrect: true,
      reactionTimeMs: 750,
    },
    {
      ...base,
      eventId: 'event-checkpoint',
      sequence: 2,
      tMs: 1_000,
      kind: 'checkpoint',
      checkpoint: 'halfway',
    },
    {
      ...base,
      eventId: 'event-completed',
      sequence: 3,
      tMs: 2_000,
      kind: 'session_completed',
      completedAt: '2026-01-02T00:00:02.000Z',
    },
  ],
} as const;

describe('canonical cognitive event contract', () => {
  it('accepts a privacy-safe completed session and converts its trials for AnalyzeSession', () => {
    expect(CompletedSessionAnalyticsJobSchema.safeParse(validJob).success).toBe(true);

    const input = completedSessionJobToAnalyzeSessionInput(validJob);
    expect(input).toMatchObject({
      schemaVersion: 1,
      sessionId: base.sessionId,
      moduleId: 'schulte',
      completedAt: validJob.completedAt,
      events: [
        { kind: 'click', isCorrect: true, reactionTimeMs: 750 },
        { kind: 'checkpoint', checkpoint: 'halfway' },
      ],
    });
  });

  it('rejects sequence, timing, and module mismatches', () => {
    expect(CompletedSessionAnalyticsJobSchema.safeParse({
      ...validJob,
      events: validJob.events.map((event, index) => index === 1 ? { ...event, sequence: 3 } : event),
    }).success).toBe(false);

    expect(CompletedSessionAnalyticsJobSchema.safeParse({
      ...validJob,
      events: validJob.events.map((event, index) => index === 2 ? { ...event, tMs: 100 } : event),
    }).success).toBe(false);

    expect(CompletedSessionAnalyticsJobSchema.safeParse({
      ...validJob,
      events: validJob.events.map((event, index) => index === 1 ? { ...event, moduleId: 'nback' } : event),
    }).success).toBe(false);
  });

  it('requires one completed terminal event for a completed analytics job', () => {
    expect(CompletedSessionAnalyticsJobSchema.safeParse({
      ...validJob,
      events: validJob.events.map((event) => event.kind === 'session_completed'
        ? { ...event, kind: 'session_abandoned', reason: 'user_exit' }
        : event),
    }).success).toBe(false);

    expect(CompletedSessionAnalyticsJobSchema.safeParse({
      ...validJob,
      events: validJob.events.map((event) => event.kind === 'session_completed'
        ? { ...event, completedAt: '2026-01-02T00:00:01.000Z' }
        : event),
    }).success).toBe(false);
  });

  it('rejects identity and raw telemetry fields before schema parsing', () => {
    expect(parseCompletedSessionAnalyticsJob({
      ...validJob,
      brainId: 'synthetic-brain-id',
    }).success).toBe(false);

    expect(parseCompletedSessionAnalyticsJob({
      ...validJob,
      events: validJob.events.map((event, index) => index === 1
        ? { ...event, screenshot: 'not-allowed' }
        : event),
    }).success).toBe(false);
  });

  it('covers all recommended cognitive module routes', () => {
    expect(assertCognitiveModuleCoverage()).toEqual([]);
  });
});
