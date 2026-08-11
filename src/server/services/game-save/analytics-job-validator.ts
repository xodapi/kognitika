import { GameAttemptError } from '../game-attempt.ts';
import {
  parseCompletedSessionAnalyticsJob,
  type CompletedSessionAnalyticsJob,
} from '../../../core/cognitive-events/index.ts';
import type { SaveGameInput } from './attempt-validator.ts';

const ANALYTICS_MODULE_GAME_TYPES: Record<string, readonly string[]> = {
  schulte: ['SCHULTE', 'SCHULTE_GORBOV'],
  stroop: ['STROOP'],
  nback: ['N_BACK'],
  numerical: ['NUMERICAL_ANALYSIS'],
  'logical-sequence': ['LOGICAL_SEQUENCE'],
  'mental-math': ['MENTAL_MATH'],
  situational: ['SITUATIONAL_JUDGMENT'],
  spatial: ['SPATIAL_CONCEALMENT'],
  'stroop-alphabet': ['STROOP_ALPHABET'],
  'schulte-90': ['SCHULTE_90'],
  'alphabet-table': ['ALPHABET_TABLE'],
  collision: ['COLLISION_DETECTOR'],
  dispatcher: ['ASYNC_DISPATCHER'],
  topology: ['TOPOLOGY_MEMORY'],
  typing: ['SPEED_TYPING'],
};

/**
 * Validates and writes analytics jobs for completed game sessions.
 * 
 * Enforces:
 * - Job schema validity
 * - Module ID and game type consistency
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

    if (!ANALYTICS_MODULE_GAME_TYPES[parsed.data.moduleId]?.includes(input.gameType)) {
      throw new GameAttemptError(
        'Analytics job does not match game type',
        400,
        'ANALYTICS_GAME_TYPE_MISMATCH',
      );
    }

    return parsed.data;
  }
}
