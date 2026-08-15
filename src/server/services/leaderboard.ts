import type { UserRepository } from '../repositories/user-repository.ts';

/**
 * Application service for retrieving leaderboard data.
 * 
 * Responsibility: fetch top users by experience and sanitize names.
 */
export class LeaderboardService {
  constructor(private userRepo: UserRepository) {}

  async getTopUsers(limit: number = 50) {
    const topUsers = await this.userRepo.findTopByExperience(limit);

    // Sanitize: show name only if it matches pseudonym, otherwise show [ANONYMOUS]
    return topUsers.map(user => ({
      ...user,
      name: user.name === user.pseudonym ? user.name : '[ANONYMOUS]'
    }));
  }
}
