import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getGameRepositories } from '../infrastructure/container.ts';
import {
  GameAttemptConflictError,
  type GameAttemptRecord,
} from '../repositories/game-attempt-repository.ts';
import { DomainError } from '../errors/domain-error.ts';

const DEFAULT_TTL_SECONDS = 15 * 60;
const DEFAULT_NOT_BEFORE_MS = 0;

export class GameAttemptError extends DomainError {
  get category() {
    return this.status === 409
      ? 'conflict' as const
      : this.status === 403
        ? 'forbidden' as const
        : 'validation' as const;
  }

  constructor(
    message: string,
    public readonly status: 400 | 403 | 409,
    public readonly code: string,
  ) {
    super(message);
  }
}

function nonNegativeInteger(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function gameAttemptTiming(now = new Date()) {
  const ttlSeconds = Math.max(1, nonNegativeInteger(process.env.GAME_ATTEMPT_TTL_SECONDS, DEFAULT_TTL_SECONDS));
  const notBeforeMs = nonNegativeInteger(process.env.GAME_ATTEMPT_NOT_BEFORE_MS, DEFAULT_NOT_BEFORE_MS);
  return {
    issuedAt: now,
    notBefore: new Date(now.getTime() + notBeforeMs),
    expiresAt: new Date(now.getTime() + Math.max(ttlSeconds * 1000, notBeforeMs + 1)),
  };
}

export function digestGameChallenge(challenge: string) {
  return createHash('sha256').update(challenge, 'utf8').digest('hex');
}

export function challengeMatches(challenge: string, digest: string) {
  const actual = Buffer.from(digestGameChallenge(challenge), 'hex');
  const expected = Buffer.from(digest, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export type StartGameAttemptInput = {
  userId: string;
  gameType: string;
  clientRunId: string;
};

export type StartGameAttemptResult = {
  attemptId: string;
  challenge: string;
  issuedAt: Date;
  notBefore: Date;
  expiresAt: Date;
};

export async function startGameAttempt(input: StartGameAttemptInput): Promise<StartGameAttemptResult> {
  const challenge = randomBytes(32).toString('base64url');
  const challengeDigest = digestGameChallenge(challenge);
  const timing = gameAttemptTiming();

  const repos = getGameRepositories();
  let attempt: GameAttemptRecord;
  try {
    attempt = await repos.gameAttempts.create({
      userId: input.userId,
      gameType: input.gameType,
      clientRunId: input.clientRunId,
      challengeDigest,
      ...timing,
    });
  } catch (error: any) {
    if (error instanceof GameAttemptConflictError) {
      throw new GameAttemptError('A game attempt already exists for this run', 409, 'ATTEMPT_ALREADY_EXISTS');
    }
    throw error;
  }

  return {
    attemptId: attempt.id,
    challenge,
    issuedAt: attempt.issuedAt,
    notBefore: attempt.notBefore,
    expiresAt: attempt.expiresAt,
  };
}
