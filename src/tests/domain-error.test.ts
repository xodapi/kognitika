import { describe, expect, it } from 'vitest';
import { GameAttemptError } from '../server/services/game-attempt.ts';
import {
  SessionForbiddenError,
  SessionNotFoundError,
} from '../server/services/game-session.ts';

describe('domain error contract', () => {
  it('classifies validation and conflict attempt errors', () => {
    expect(new GameAttemptError('Invalid attempt', 400, 'INVALID_ATTEMPT')).toMatchObject({
      category: 'validation',
      status: 400,
      code: 'INVALID_ATTEMPT',
    });
    expect(new GameAttemptError('Duplicate attempt', 409, 'ATTEMPT_EXISTS')).toMatchObject({
      category: 'conflict',
      status: 409,
      code: 'ATTEMPT_EXISTS',
    });
  });

  it('classifies authorization errors with stable public codes', () => {
    expect(new SessionNotFoundError('Session not found')).toMatchObject({
      category: 'notFound',
      status: 404,
      code: 'SESSION_NOT_FOUND',
    });
    expect(new SessionForbiddenError('Forbidden')).toMatchObject({
      category: 'forbidden',
      status: 403,
      code: 'SESSION_FORBIDDEN',
    });
  });
});
