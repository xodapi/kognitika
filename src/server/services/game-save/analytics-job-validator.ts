import { GameAttemptError } from '../game-attempt.ts';
import {
  parseCompletedSessionAnalyticsJob,
  type CompletedSessionAnalyticsJob,
} from '../../../core/cognitive-events/index.ts';
import type { SaveGameInput } from './attempt-validator.ts';
import { getAnalyticsModuleRegistry } from './analytics-registry-factory.ts';

/**
 * Validates and writes analytics jobs for completed game sessions.
 * 
 * Enforces:
 * - Job schema validity
 * - Module ID and game type consistency via registry lookup
 */
export class AnalyticsJobValidator {
  /**
   * Validates an optional analytics job payload.
   * 
   * @throws {GameAttemptError} INVALID_ANALYTICS_JOB if schema is invalid
   * @throws {GameAttemptError} ANALYTICS_GAME_TYPE_MISMATCH if moduleId doesn't support gameType
   * @returns Parsed job or undefined if not provided
   */
  validate(input: SaveGameInput): CompletedSessionAnalyticsJob | undefined {
    if (input.analyticsJob === undefined) return undefined;

    const parsed = parseCompletedSessionAnalyticsJob(input.analyticsJob);
    if (!parsed.success) {
      throw new GameAttemptError('Invalid canonical analytics job', 400, 'INVALID_ANALYTICS_JOB');
    }

    const registry = getAnalyticsModuleRegistry();
    const module = registry.findByModuleId(parsed.data.moduleId);
    
    if (!module || !module.supports(input.gameType)) {
      throw new GameAttemptError(
        'Analytics job does not match game type',
        400,
        'ANALYTICS_GAME_TYPE_MISMATCH',
      );
    }

    return parsed.data;
  }
}
