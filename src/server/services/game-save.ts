import { Prisma, type GameSession, type User } from '@prisma/client';
import prisma from '../../lib/prisma.ts';
import { challengeMatches, GameAttemptError } from './game-attempt.ts';
import { computeServerScore } from './game-score.ts';
import {
  createAnalyticsOutboxEntry,
  isAnalyticsOutboxEnabled,
} from '../../core/analytics-outbox/index.ts';
import {
  parseCompletedSessionAnalyticsJob,
  type CompletedSessionAnalyticsJob,
} from '../../core/cognitive-events/index.ts';

const SHADOW_ANALYZER_VERSION = 'rust-shadow-v1';
const ANALYTICS_CONTRACT_VERSION = 'analytics-contract-v1';

const ANALYTICS_MODULE_GAME_TYPES: Record<string, readonly string[]> = {
  schulte: ['SCHULTE', 'SCHULTE_GORBOV'],
};

function validateAnalyticsJob(input: SaveGameInput): CompletedSessionAnalyticsJob | undefined {
  if (input.analyticsJob === undefined) return undefined;
  const parsed = parseCompletedSessionAnalyticsJob(input.analyticsJob);
  if (!parsed.success) {
    throw new GameAttemptError('Invalid canonical analytics job', 400, 'INVALID_ANALYTICS_JOB');
  }
  if (!ANALYTICS_MODULE_GAME_TYPES[parsed.data.moduleId]?.includes(input.gameType)) {
    throw new GameAttemptError('Analytics job does not match game type', 400, 'ANALYTICS_GAME_TYPE_MISMATCH');
  }
  return parsed.data;
}

export type SaveGameInput = {
  userId: string;
  clientRunId?: string;
  attemptId?: string;
  challenge?: string;
  gameType: string;
  timeMs: number;
  metadata?: Record<string, unknown>;
  analyticsJob?: unknown;
};

export type SaveGameResult = {
  session: GameSession;
  user: User;
  isReplay: boolean;
};

function nextStreak(user: User, now: Date) {
  if (!user.lastPlayedAt) return 1;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastPlayed = new Date(user.lastPlayedAt);
  const lastDay = new Date(lastPlayed.getFullYear(), lastPlayed.getMonth(), lastPlayed.getDate());
  const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return user.streakDays + 1;
  if (diffDays > 1) return 1;
  return user.streakDays;
}

function assertReplayMatches(session: GameSession, input: SaveGameInput, score: number) {
  if (
    session.userId !== input.userId
    || session.clientRunId !== input.clientRunId
    || session.gameType !== input.gameType
    || session.timeMs !== input.timeMs
    || session.score !== score
  ) {
    throw new GameAttemptError('Game save conflicts with the completed attempt', 409, 'ATTEMPT_REPLAY_CONFLICT');
  }
}

async function replayResult(input: SaveGameInput, score: number): Promise<SaveGameResult | null> {
  const session = await prisma.gameSession.findUnique({
    where: { userId_clientRunId: { userId: input.userId, clientRunId: input.clientRunId! } },
  });
  if (!session) return null;
  assertReplayMatches(session, input, score);
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  return user ? { session, user, isReplay: true } : null;
}

function validateAttemptContract(
  attempt: {
    userId: string;
    gameType: string;
    clientRunId: string;
    challengeDigest: string;
  } | null,
  input: SaveGameInput,
) {
  if (!attempt || attempt.userId !== input.userId || !input.challenge || !challengeMatches(input.challenge, attempt.challengeDigest)) {
    throw new GameAttemptError('Invalid game attempt credentials', 403, 'INVALID_ATTEMPT_CREDENTIALS');
  }
  if (attempt.gameType !== input.gameType || attempt.clientRunId !== input.clientRunId) {
    throw new GameAttemptError('Game attempt contract does not match', 409, 'ATTEMPT_CONTRACT_MISMATCH');
  }
}

function validateAttemptWindow(attempt: { notBefore: Date; expiresAt: Date }, now: Date) {
  if (now < attempt.notBefore) {
    throw new GameAttemptError('Game attempt is not ready', 409, 'ATTEMPT_NOT_READY');
  }
  if (now >= attempt.expiresAt) {
    throw new GameAttemptError('Game attempt has expired', 409, 'ATTEMPT_EXPIRED');
  }
}

export async function saveCompletedGame(input: SaveGameInput): Promise<SaveGameResult> {
  const hasAttempt = Boolean(input.attemptId || input.challenge);
  if (hasAttempt && (!input.attemptId || !input.challenge || !input.clientRunId)) {
    throw new GameAttemptError('attemptId, challenge, and clientRunId are required together', 400, 'INCOMPLETE_ATTEMPT');
  }
  if (!hasAttempt && process.env.GAME_SAVE_LEGACY_COMPAT_ENABLED !== 'true') {
    throw new GameAttemptError('A game attempt is required', 400, 'ATTEMPT_REQUIRED');
  }

  const analyticsJob = validateAnalyticsJob(input);
  const score = computeServerScore(input);
  try {
    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      let attempt: Awaited<ReturnType<typeof tx.gameAttempt.findUnique>> = null;

      if (hasAttempt) {
        attempt = await tx.gameAttempt.findUnique({ where: { id: input.attemptId! } });
        validateAttemptContract(attempt, input);

        if (attempt!.consumedAt || attempt!.gameSessionId) {
          if (!attempt!.gameSessionId) {
            throw new GameAttemptError('Game attempt was already consumed', 409, 'ATTEMPT_ALREADY_CONSUMED');
          }
          const session = await tx.gameSession.findUnique({ where: { id: attempt!.gameSessionId } });
          if (!session) {
            throw new GameAttemptError('Game attempt was already consumed', 409, 'ATTEMPT_ALREADY_CONSUMED');
          }
          assertReplayMatches(session, input, score);
          const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
          return { session, user, isReplay: true };
        }

        validateAttemptWindow(attempt!, now);
        const reserved = await tx.gameAttempt.updateMany({
          where: {
            id: input.attemptId!,
            userId: input.userId,
            consumedAt: null,
            gameSessionId: null,
            notBefore: { lte: now },
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });
        if (reserved.count !== 1) {
          const concurrentAttempt = await tx.gameAttempt.findUnique({ where: { id: input.attemptId! } });
          if (concurrentAttempt?.gameSessionId) {
            const session = await tx.gameSession.findUnique({ where: { id: concurrentAttempt.gameSessionId } });
            if (session) {
              assertReplayMatches(session, input, score);
              const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
              return { session, user, isReplay: true };
            }
          }
          throw new GameAttemptError('Game attempt was already consumed', 409, 'ATTEMPT_ALREADY_CONSUMED');
        }
      } else if (input.clientRunId) {
        const existingSession = await tx.gameSession.findUnique({
          where: { userId_clientRunId: { userId: input.userId, clientRunId: input.clientRunId } },
        });
        if (existingSession) {
          assertReplayMatches(existingSession, input, score);
          const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
          return { session: existingSession, user, isReplay: true };
        }
      }

      const currentUser = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
      const session = await tx.gameSession.create({
        data: {
          userId: input.userId,
          clientRunId: input.clientRunId,
          gameType: input.gameType as any,
          score,
          timeMs: input.timeMs,
          isCompleted: true,
          metadata: (input.metadata || {}) as Prisma.InputJsonValue,
        },
      });
      if (analyticsJob) {
        await tx.completedSessionAnalyticsJob.create({
          data: {
            jobId: analyticsJob.jobId,
            gameSessionId: session.id,
            moduleId: analyticsJob.moduleId,
            moduleVersion: analyticsJob.moduleVersion,
            category: analyticsJob.category,
            analyzerVersion: analyticsJob.analyzerVersion,
            completedAt: new Date(analyticsJob.completedAt),
            payload: analyticsJob as unknown as Prisma.InputJsonValue,
          },
        });
      }
      if (isAnalyticsOutboxEnabled()) {
        const entry = createAnalyticsOutboxEntry({
          sourceSession: session.id,
          analyzerVersion: SHADOW_ANALYZER_VERSION,
          contractVersion: ANALYTICS_CONTRACT_VERSION,
          occurredAt: now,
        });
        await tx.analyticsOutboxEntry.create({
          data: {
            sourceSessionId: session.id,
            analyzerVersion: entry.analyzerVersion,
            contractVersion: entry.contractVersion,
            idempotencyKey: entry.idempotencyKey,
            occurredAt: entry.occurredAt,
          },
        });
      }
      if (hasAttempt) {
        await tx.gameAttempt.update({
          where: { id: input.attemptId! },
          data: { gameSessionId: session.id },
        });
      }
      let user = await tx.user.update({
        where: { id: input.userId },
        data: {
          experience: { increment: score },
          streakDays: nextStreak(currentUser, now),
          lastPlayedAt: now,
          ...(input.metadata?.distraction && input.metadata.distraction !== 'none' ? {
            rating: { increment: Math.max(1, Math.floor(100000 / input.timeMs) - 5) },
          } : {}),
        },
      });
      const currentLevel = Math.floor(user.experience / 500) + 1;
      if (currentLevel > user.level) {
        user = await tx.user.update({ where: { id: user.id }, data: { level: currentLevel } });
      }
      await tx.xpEvent.create({
        data: {
          userId: input.userId,
          gameSessionId: session.id,
          amount: score,
          reason: `game:${input.gameType}`,
        },
      });
      return { session, user, isReplay: false };
    });
  } catch (error) {
    if (input.clientRunId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const replay = await replayResult(input, score);
      if (replay) return replay;
    }
    throw error;
  }
}
