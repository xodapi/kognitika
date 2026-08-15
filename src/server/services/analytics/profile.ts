import type { AnalyticsSessionRepository } from '../../repositories/analytics-session-repository.ts';

export type ProfileResult = {
  completedSessions: number;
  uniqueGamesPlayed: number;
  totalPlayTimeMinutes: number;
  profileReady: boolean;
};

const PROFILE_READY_SESSION_THRESHOLD = 5;

export class ProfileService {
  constructor(private readonly sessions: AnalyticsSessionRepository) {}

  async getUserProfile(userId: string): Promise<ProfileResult> {
    const sessions = await this.sessions.findCompletedByUser(userId);

    const completedSessions = sessions.length;
    const uniqueGamesPlayed = new Set(sessions.map(s => s.gameType)).size;
    const totalPlayTimeMinutes = Math.round(
      sessions.reduce((sum, s) => sum + (s.timeMs || 0), 0) / 60000,
    );
    const profileReady = completedSessions >= PROFILE_READY_SESSION_THRESHOLD;

    return {
      completedSessions,
      uniqueGamesPlayed,
      totalPlayTimeMinutes,
      profileReady,
    };
  }
}
