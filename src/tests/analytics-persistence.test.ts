/**
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createSessionAnalyticsSummary,
  parseSessionAnalyticsJob,
  createFatigueCurveSession,
  type SessionAnalyticsJob,
} from '../core/analyze-session/index.ts';

const prismaMock = vi.hoisted(() => ({
  sessionAnalyticsSummary: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('../lib/prisma.ts', () => ({
  default: prismaMock,
}));

const baseSession = createFatigueCurveSession();

const baseJob: SessionAnalyticsJob = {
  schemaVersion: 1,
  jobId: 'analytics-job-test-persistence-001',
  analyzerVersion: 'analyze-session-v1',
  receivedAt: '2026-06-23T00:00:00.000Z',
  session: baseSession,
};

describe('analytics persistence contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.sessionAnalyticsSummary.upsert.mockResolvedValue({});
  });

  it('creates a valid summary record from a job', () => {
    const summary = createSessionAnalyticsSummary(baseJob, new Date('2026-06-23T00:10:00.000Z'));

    expect(summary.schemaVersion).toBe(1);
    expect(summary.analyzerVersion).toBe('analyze-session-v1');
    expect(summary.jobId).toBe('analytics-job-test-persistence-001');
    expect(summary.sourceSessionId).toBe(baseSession.sessionId);
    expect(summary.moduleId).toBe(baseSession.moduleId);
    expect(summary.category).toBe('cognitive');
    expect(summary.completed).toBe(true);
    expect(summary.eventCount).toBe(baseSession.events.length);
    expect(summary.accuracy).toBeGreaterThanOrEqual(0);
    expect(summary.accuracy).toBeLessThanOrEqual(1);
    expect(summary.fatigueIndex).toBeGreaterThanOrEqual(-1);
    expect(summary.fatigueIndex).toBeLessThanOrEqual(1);
  });

  it('rejects jobs with sensitive fields', () => {
    expect(parseSessionAnalyticsJob({ ...baseJob, token: 'abc' }).success).toBe(false);
    expect(parseSessionAnalyticsJob({ ...baseJob, email: 'test@test.com' }).success).toBe(false);
    expect(parseSessionAnalyticsJob({ ...baseJob, brainId: '123' }).success).toBe(false);
    expect(parseSessionAnalyticsJob({ ...baseJob, session: { ...baseSession, metadata: { localStorage: '{}' } } }).success).toBe(false);
  });

  it('persists summary to database via upsert', async () => {
    const { persistSessionAnalyticsSummary } = await import('../server/services/analytics-persistence.ts');
    const summary = createSessionAnalyticsSummary(baseJob);

    await persistSessionAnalyticsSummary(summary);

    expect(prismaMock.sessionAnalyticsSummary.upsert).toHaveBeenCalledOnce();
    const call = prismaMock.sessionAnalyticsSummary.upsert.mock.calls[0][0];
    expect(call.where.jobId).toBe(summary.jobId);
    expect(call.create.moduleId).toBe(summary.moduleId);
    expect(call.create.accuracy).toBe(summary.accuracy);
  });

  it('rejects summary with sensitive material', async () => {
    const { persistSessionAnalyticsSummary } = await import('../server/services/analytics-persistence.ts');
    const summary = createSessionAnalyticsSummary(baseJob);

    const tampered = { ...summary, jobId: 'analytics-job-test-token-leak' };
    (tampered as any).token = 'should-be-rejected';

    await expect(persistSessionAnalyticsSummary(tampered as any)).rejects.toThrow('sensitive');
    expect(prismaMock.sessionAnalyticsSummary.upsert).not.toHaveBeenCalled();
  });

  it('queries summaries with filters', async () => {
    const { getSessionAnalyticsSummaries } = await import('../server/services/analytics-persistence.ts');
    const mockRecord = {
      id: '1', jobId: 'j1', sourceSessionId: 's1', moduleId: 'nback',
      category: 'cognitive', completed: true, createdAt: new Date(),
      eventCount: 10, clickCount: 5, durationMs: 1000,
      p50ReactionMs: 200, p95ReactionMs: 400, speedSlope: 0.1,
      accuracy: 0.85, fatigueIndex: 0.1, engagementIndex: 0.9,
      suspiciousPatternScore: 0.05, recommendationSignals: [],
    };
    prismaMock.sessionAnalyticsSummary.findMany.mockResolvedValue([mockRecord]);

    const results = await getSessionAnalyticsSummaries({ moduleId: 'nback', category: 'cognitive' });
    expect(results).toHaveLength(1);
    expect(prismaMock.sessionAnalyticsSummary.findMany).toHaveBeenCalledOnce();
  });

  it('aggregates trend data by day', async () => {
    const { getModuleTrendData } = await import('../server/services/analytics-persistence.ts');
    const now = new Date('2026-06-23T12:00:00.000Z');
    prismaMock.sessionAnalyticsSummary.findMany.mockResolvedValue([
      { accuracy: 0.8, p50ReactionMs: 200, fatigueIndex: 0.1, engagementIndex: 0.9, createdAt: new Date('2026-06-22T10:00:00.000Z') },
      { accuracy: 0.85, p50ReactionMs: 180, fatigueIndex: 0.05, engagementIndex: 0.95, createdAt: new Date('2026-06-22T14:00:00.000Z') },
      { accuracy: 0.9, p50ReactionMs: 170, fatigueIndex: 0.02, engagementIndex: 0.97, createdAt: new Date('2026-06-23T08:00:00.000Z') },
    ]);

    const trend = await getModuleTrendData('nback', 7);

    expect(trend).toHaveLength(2);
    expect(trend[0].date).toBe('2026-06-22');
    expect(trend[0].sessionCount).toBe(2);
    expect(trend[0].accuracy).toBeCloseTo(0.825, 2);
    expect(trend[1].date).toBe('2026-06-23');
    expect(trend[1].sessionCount).toBe(1);
  });
});
