import type { GameSessionRepository } from '../repositories/game-session-repository.ts';

/**
 * Application service for retrieving user game progress.
 * 
 * Responsibility: fetch completed game sessions for a user.
 */
export class GameProgressService {
  constructor(private gameSessionRepo: GameSessionRepository) {}

  async getUserProgress(userId: string) {
    return await this.gameSessionRepo.findCompletedByUser(userId);
  }
}
