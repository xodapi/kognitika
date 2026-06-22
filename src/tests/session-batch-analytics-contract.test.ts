import { describe, expect, it } from 'vitest';
import {
  SessionAnalyticsSummaryRecordSchema,
  createFatigueCurveSession,
  createSessionAnalyticsSummary,
  parseSessionAnalyticsJob,
} from '../core/analyze-session';

const baseJob = {
  schemaVersion: 1,
  jobId: 'analytics-job-synthetic-fatigue',
  analyzerVersion: 'analyze-session-v1',
  receivedAt: '2026-01-02T00:00:00.000Z',
  session: createFatigueCurveSession(),
} as const;

describe('server-side session batch analytics contract', () => {
  it('creates a privacy-safe summary record from a completed session', () => {
    const summary = createSessionAnalyticsSummary(
      baseJob,
      new Date('2026-01-02T00:10:00.000Z'),
    );

    expect(SessionAnalyticsSummaryRecordSchema.safeParse(summary).success).toBe(true);
    expect(summary).toMatchObject({
      schemaVersion: 1,
      analyzerVersion: 'analyze-session-v1',
      jobId: 'analytics-job-synthetic-fatigue',
      sourceSessionId: 'synthetic-v2-fatigue-curve',
      moduleId: 'nback',
      category: 'cognitive',
      completed: true,
      eventCount: baseJob.session.events.length,
      recommendationSignals: expect.arrayContaining(['recovery']),
    });
    expect(JSON.stringify(summary)).not.toMatch(/brainId|token|email|password|localStorage|rawStorage/i);
  });

  it('rejects identity and raw storage material before analysis', () => {
    expect(parseSessionAnalyticsJob({
      ...baseJob,
      token: 'synthetic-token',
    }).success).toBe(false);

    expect(parseSessionAnalyticsJob({
      ...baseJob,
      session: {
        ...baseJob.session,
        metadata: { localStorage: '{}' },
      },
    }).success).toBe(false);
  });
});
