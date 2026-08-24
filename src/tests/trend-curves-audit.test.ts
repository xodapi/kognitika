/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CognitiveTrendService } from '../server/services/analytics/cognitive-trend.ts';
import type { AnalyticsSummaryRepository } from '../server/repositories/analytics-summary-repository.ts';
import { getModuleTrendData } from '../server/services/analytics-persistence.ts';
import { resetGameRepositories, setAnalyticsRepositories } from '../server/infrastructure/container.ts';
import type { AnalyticsSessionRepository } from '../server/repositories/analytics-session-repository.ts';

const fixedNow = new Date('2026-08-24T12:00:00.000Z');

type TrendRow = {
  createdAt: Date;
  accuracy: number;
  p50ReactionMs: number;
  fatigueIndex: number;
  engagementIndex: number;
};

function row(
  createdAt: string,
  accuracy: number,
  p50ReactionMs = 200,
): TrendRow {
  return {
    createdAt: new Date(createdAt),
    accuracy,
    p50ReactionMs,
    fatigueIndex: 0.1,
    engagementIndex: 0.9,
  };
}

describe('cognitive trend audit contract', () => {
  const findTrendRows = vi.fn();
  const repository = { findTrendRows } as unknown as AnalyticsSummaryRepository;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    findTrendRows.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetGameRepositories();
  });

  it.each([7, 30])('passes the %i-day window to the repository', async (days) => {
    findTrendRows.mockResolvedValue([]);
    const service = new CognitiveTrendService(repository);

    await service.getCognitiveTrend({
      userId: 'user-trend-a',
      moduleId: 'stroop',
      days,
    });

    const expectedFrom = new Date(fixedNow);
    expectedFrom.setDate(expectedFrom.getDate() - days);
    expect(findTrendRows).toHaveBeenCalledWith(
      'user-trend-a',
      'stroop',
      expectedFrom,
    );
  });

  it.each([7, 30])('legacy module trend aggregation uses the %i-day window', async (days) => {
    findTrendRows.mockResolvedValue([]);
    setAnalyticsRepositories({
      sessions: {} as AnalyticsSessionRepository,
      summaries: repository,
    });

    await getModuleTrendData('user-trend-a', 'stroop', days);

    const expectedFrom = new Date(fixedNow);
    expectedFrom.setDate(expectedFrom.getDate() - days);
    expect(findTrendRows).toHaveBeenCalledWith('user-trend-a', 'stroop', expectedFrom);
  });

  it('keeps analytics scoped to the authenticated user and module', async () => {
    findTrendRows.mockResolvedValue([
      row('2026-08-23T10:00:00.000Z', 0.8),
    ]);
    const service = new CognitiveTrendService(repository);

    const trend = await service.getCognitiveTrend({
      userId: 'user-trend-a',
      moduleId: 'nback',
      days: 30,
    });

    expect(findTrendRows).toHaveBeenCalledWith(
      'user-trend-a',
      'nback',
      expect.any(Date),
    );
    expect(JSON.stringify(trend)).not.toMatch(/user-trend-a|brainId|email|token/i);
    expect(trend).not.toHaveProperty('userId');
  });

  it('preserves sparse days without fabricating zero-valued points', async () => {
    findTrendRows.mockResolvedValue([
      row('2026-07-26T10:00:00.000Z', 0.7, 260),
      row('2026-08-22T10:00:00.000Z', 0.9, 160),
    ]);
    const service = new CognitiveTrendService(repository);

    const trend = await service.getCognitiveTrend({
      userId: 'user-trend-a',
      days: 30,
    });

    expect(trend.points).toEqual([
      expect.objectContaining({
        date: '2026-07-26',
        accuracy: 0.7,
        reactionMs: 260,
        sessionCount: 1,
      }),
      expect.objectContaining({
        date: '2026-08-22',
        accuracy: 0.9,
        reactionMs: 160,
        sessionCount: 1,
      }),
    ]);
    expect(trend.points).toHaveLength(2);
    expect(trend.summary.totalSessions).toBe(2);
  });
});
