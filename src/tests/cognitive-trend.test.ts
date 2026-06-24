/**
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  sessionAnalyticsSummary: {
    findMany: vi.fn(),
  },
}));

vi.mock('../lib/prisma.ts', () => ({
  default: prismaMock,
}));

describe('cognitive trend computation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes trend with improving direction', async () => {
    const { computeCognitiveTrend } = await import('../server/services/analytics-persistence.ts');

    const now = new Date();
    const earlyDate = new Date(now);
    earlyDate.setDate(earlyDate.getDate() - 20);
    const lateDate = new Date(now);
    lateDate.setDate(lateDate.getDate() - 5);

    prismaMock.sessionAnalyticsSummary.findMany.mockResolvedValue([
      { accuracy: 0.6, p50ReactionMs: 300, fatigueIndex: 0.3, engagementIndex: 0.7, createdAt: earlyDate },
      { accuracy: 0.65, p50ReactionMs: 280, fatigueIndex: 0.25, engagementIndex: 0.75, createdAt: earlyDate },
      { accuracy: 0.85, p50ReactionMs: 200, fatigueIndex: 0.1, engagementIndex: 0.9, createdAt: lateDate },
      { accuracy: 0.9, p50ReactionMs: 180, fatigueIndex: 0.05, engagementIndex: 0.95, createdAt: lateDate },
    ]);

    const trend = await computeCognitiveTrend(null, 30);

    expect(trend.overallDirection).toBe('improving');
    expect(trend.points.length).toBeGreaterThan(0);
    expect(trend.summary.totalSessions).toBe(4);
    expect(trend.summary.avgAccuracy).toBeGreaterThan(0);
    expect(trend.timespanDays).toBe(30);
  });

  it('computes trend with declining direction', async () => {
    const { computeCognitiveTrend } = await import('../server/services/analytics-persistence.ts');

    const now = new Date();
    const earlyDate = new Date(now);
    earlyDate.setDate(earlyDate.getDate() - 20);
    const lateDate = new Date(now);
    lateDate.setDate(lateDate.getDate() - 5);

    prismaMock.sessionAnalyticsSummary.findMany.mockResolvedValue([
      { accuracy: 0.9, p50ReactionMs: 180, fatigueIndex: 0.05, engagementIndex: 0.95, createdAt: earlyDate },
      { accuracy: 0.88, p50ReactionMs: 190, fatigueIndex: 0.08, engagementIndex: 0.92, createdAt: earlyDate },
      { accuracy: 0.6, p50ReactionMs: 300, fatigueIndex: 0.3, engagementIndex: 0.7, createdAt: lateDate },
      { accuracy: 0.55, p50ReactionMs: 320, fatigueIndex: 0.35, engagementIndex: 0.65, createdAt: lateDate },
    ]);

    const trend = await computeCognitiveTrend(null, 30);

    expect(trend.overallDirection).toBe('declining');
  });

  it('computes stable direction for flat data', async () => {
    const { computeCognitiveTrend } = await import('../server/services/analytics-persistence.ts');

    const now = new Date();
    const earlyDate = new Date(now);
    earlyDate.setDate(earlyDate.getDate() - 20);
    const lateDate = new Date(now);
    lateDate.setDate(lateDate.getDate() - 5);

    prismaMock.sessionAnalyticsSummary.findMany.mockResolvedValue([
      { accuracy: 0.8, p50ReactionMs: 200, fatigueIndex: 0.1, engagementIndex: 0.9, createdAt: earlyDate },
      { accuracy: 0.81, p50ReactionMs: 198, fatigueIndex: 0.11, engagementIndex: 0.89, createdAt: lateDate },
    ]);

    const trend = await computeCognitiveTrend('nback', 30);

    expect(trend.overallDirection).toBe('stable');
    expect(trend.moduleId).toBe('nback');
  });

  it('returns stable for empty data', async () => {
    const { computeCognitiveTrend } = await import('../server/services/analytics-persistence.ts');

    prismaMock.sessionAnalyticsSummary.findMany.mockResolvedValue([]);

    const trend = await computeCognitiveTrend(null, 30);

    expect(trend.overallDirection).toBe('stable');
    expect(trend.points).toHaveLength(0);
    expect(trend.summary.totalSessions).toBe(0);
    expect(trend.summary.avgAccuracy).toBe(0);
  });

  it('filters by moduleId when provided', async () => {
    const { computeCognitiveTrend } = await import('../server/services/analytics-persistence.ts');

    prismaMock.sessionAnalyticsSummary.findMany.mockResolvedValue([]);

    await computeCognitiveTrend('stroop', 14);

    const call = prismaMock.sessionAnalyticsSummary.findMany.mock.calls[0][0];
    expect(call.where.moduleId).toBe('stroop');
  });

  it('aggregates multiple sessions on the same day', async () => {
    const { computeCognitiveTrend } = await import('../server/services/analytics-persistence.ts');

    const sameDay = new Date('2026-06-20T10:00:00.000Z');

    prismaMock.sessionAnalyticsSummary.findMany.mockResolvedValue([
      { accuracy: 0.7, p50ReactionMs: 250, fatigueIndex: 0.2, engagementIndex: 0.8, createdAt: sameDay },
      { accuracy: 0.9, p50ReactionMs: 150, fatigueIndex: 0.05, engagementIndex: 0.95, createdAt: sameDay },
    ]);

    const trend = await computeCognitiveTrend(null, 30);

    expect(trend.points).toHaveLength(1);
    expect(trend.points[0].sessionCount).toBe(2);
    expect(trend.points[0].accuracy).toBeCloseTo(0.8, 2);
    expect(trend.points[0].reactionMs).toBe(200);
  });
});
