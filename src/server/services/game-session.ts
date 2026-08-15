import type { GameSessionRepository } from '../repositories/game-session-repository.ts';
import { DomainError } from '../errors/domain-error.ts';

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

export class SessionNotFoundError extends DomainError {
  readonly category = 'notFound' as const;
  readonly code = 'SESSION_NOT_FOUND';
  readonly status = 404;

  constructor(message: string) {
    super(message);
  }
}

export class SessionForbiddenError extends DomainError {
  readonly category = 'forbidden' as const;
  readonly code = 'SESSION_FORBIDDEN';
  readonly status = 403;

  constructor(message: string) {
    super(message);
  }
}
