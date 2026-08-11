import { describe, expect, it } from 'vitest';
import { ComparisonService } from '../server/services/analytics/comparison.ts';
import { ExportService } from '../server/services/analytics/export.ts';
import { ProfileService } from '../server/services/analytics/profile.ts';
import type {
  AnalyticsSession,
  AnalyticsSessionRepository,
} from '../server/repositories/analytics-session-repository.ts';

class InMemoryAnalyticsSessionRepository implements AnalyticsSessionRepository {
  constructor(private readonly sessions: AnalyticsSession[]) {}

  async findCompletedByUser(): Promise<AnalyticsSession[]> {
    return this.sessions;
  }

  async findRecentCompletedByUserAndGameType(
    _userId: string,
    gameType: string,
    limit: number,
  ): Promise<AnalyticsSession[]> {
    return this.sessions.filter((session) => session.gameType === gameType).slice(0, limit);
  }

  async countCompletedByGameType(gameType: string): Promise<number> {
    return this.sessions.filter((session) => session.gameType === gameType).length;
  }

  async countCompletedWithScoreBelow(gameType: string, score: number): Promise<number> {
    return this.sessions.filter(
      (session) => session.gameType === gameType && session.score < score,
    ).length;
  }
}

const sessions: AnalyticsSession[] = [
  { gameType: 'SCHULTE', score: 100, timeMs: 1_000, createdAt: new Date('2026-08-01') },
  { gameType: 'SCHULTE', score: 200, timeMs: 2_000, createdAt: new Date('2026-08-02') },
  { gameType: 'STROOP', score: 300, timeMs: 3_000, createdAt: new Date('2026-08-03') },
  { gameType: 'N_BACK', score: 400, timeMs: 4_000, createdAt: new Date('2026-08-04') },
  { gameType: 'N_BACK', score: 500, timeMs: 5_000, createdAt: new Date('2026-08-05') },
];

describe('analytics services', () => {
  it('compares performance through the repository port', async () => {
    const service = new ComparisonService(new InMemoryAnalyticsSessionRepository(sessions));

    const result = await service.compare({
      gameType: 'SCHULTE',
      score: 300,
      timeMs: 900,
      errors: 0,
      userId: 'synthetic-user',
    });

    expect(result).toMatchObject({
      deltaPercentage: 100,
      trend: 'up',
      percentile: 98,
      recommendedGame: 'stroop',
    });
  });

  it('builds a profile through the repository port', async () => {
    const service = new ProfileService(new InMemoryAnalyticsSessionRepository(sessions));

    await expect(service.getUserProfile('synthetic-user')).resolves.toEqual({
      completedSessions: 5,
      uniqueGamesPlayed: 3,
      totalPlayTimeMinutes: 0,
      profileReady: true,
    });
  });

  it('builds a privacy-safe export without exposing raw session data', async () => {
    const service = new ExportService(new InMemoryAnalyticsSessionRepository(sessions));

    const result = await service.exportUserData('synthetic-user');

    expect(result.privacy.personal_identifiers_included).toBe(false);
    expect(result.privacy.raw_session_data_included).toBe(false);
    expect(result.dataset.completed_sessions_analyzed).toBe(5);
    expect(JSON.stringify(result)).not.toContain('synthetic-user');
  });
});
