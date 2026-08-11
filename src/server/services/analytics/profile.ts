import prisma from '../../../lib/prisma.ts';

export type ProfileResult = {
  completedSessions: number;
  uniqueGamesPlayed: number;
  totalPlayTimeMinutes: number;
  profileReady: boolean;
};

const PROFILE_READY_SESSION_THRESHOLD = 5;

export class ProfileService {
  async getUserProfile(userId: string): Promise<ProfileResult> {
    const sessions = await prisma.gameSession.findMany({
      where: { userId, isCompleted: true },
      select: { gameType: true, timeMs: true },
    });

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
