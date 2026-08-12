export type StreakState = {
  lastPlayedAt: Date | null;
  streakDays: number;
};

/**
 * Calculates the user's daily streak based on their last play date.
 * 
 * Rules:
 * - First play: streak = 1
 * - Consecutive day: streak + 1
 * - Gap > 1 day: reset to 1
 * - Same day: keep current streak
 */
export class StreakPolicy {
  /**
   * Computes the next streak value.
   * 
   * @param user Current user state with lastPlayedAt and streakDays
   * @param now Current timestamp
   * @returns The new streak value
   */
  nextStreak(user: StreakState, now: Date): number {
    if (!user.lastPlayedAt) return 1;

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastPlayed = new Date(user.lastPlayedAt);
    const lastDay = new Date(lastPlayed.getFullYear(), lastPlayed.getMonth(), lastPlayed.getDate());
    
    const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return user.streakDays + 1;
    if (diffDays > 1) return 1;
    return user.streakDays;
  }
}
