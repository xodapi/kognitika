import type { GameSessionRepository } from '../repositories/game-session-repository.ts';

/**
 * Application service for managing game session metadata.
 * 
 * Responsibilities:
 * - Retrieve session and verify ownership
 * - Merge and update metadata
 */
export class GameSessionService {
  constructor(private gameSessionRepo: GameSessionRepository) {}

  async updateMetadata(sessionId: string, userId: string, metadata: Record<string, unknown>) {
    const session = await this.gameSessionRepo.findById(sessionId);
    
    if (!session) {
      throw new SessionNotFoundError('Session not found');
    }
    
    if (session.userId !== userId) {
      throw new SessionForbiddenError('Forbidden');
    }

    const mergedMetadata = {
      ...(session.metadata as Record<string, any>),
      ...metadata,
    };

    return await this.gameSessionRepo.replaceMetadata(sessionId, mergedMetadata);
  }
}

export class SessionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionNotFoundError';
  }
}

export class SessionForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionForbiddenError';
  }
}
