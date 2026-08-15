import { saveCompletedGame, type SaveGameInput } from './game-save.ts';
import { eventBus } from '../events/event-bus.ts';

interface GameCompletionInput {
  userId: string;
  clientRunId?: string;
  attemptId?: string;
  challenge?: string;
  gameType: string;
  timeMs: number;
  metadata?: Record<string, unknown>;
  analyticsJob?: unknown;
}

interface GameCompletionResult {
  session: {
    id: string;
    score: number;
    [key: string]: unknown;
  };
  newLevel: number;
  streakDays: number;
}

/**
 * Application service for completing a game session.
 * 
 * Responsibilities:
 * - Coordinate saveCompletedGame
 * - Emit GAME_COMPLETED event (if not replay)
 * - Map result to response DTO (calculate level, extract streak)
 */
export class GameCompletionService {
  async complete(input: GameCompletionInput): Promise<GameCompletionResult> {
    const saveResult = await saveCompletedGame({
      userId: input.userId,
      clientRunId: input.clientRunId,
      attemptId: input.attemptId,
      challenge: input.challenge,
      gameType: input.gameType,
      timeMs: input.timeMs,
      metadata: input.metadata,
      ...(input.analyticsJob === undefined ? {} : { analyticsJob: input.analyticsJob }),
    });

    const currentLevel = Math.floor(saveResult.user.experience / 500) + 1;

    // Emit event if not a replay
    if (!saveResult.isReplay) {
      const EventBusClass: any = eventBus.constructor;
      eventBus.emit(EventBusClass.EVENTS.GAME_COMPLETED, {
        userId: input.userId,
        sessionId: saveResult.session.id,
        score: saveResult.session.score,
        gameType: input.gameType,
        metadata: input.metadata,
      });
    }

    return {
      session: saveResult.session,
      newLevel: currentLevel,
      streakDays: saveResult.user.streakDays,
    };
  }
}
