import { Prisma, type GameSession, type PrismaClient, type User } from '@prisma/client';
import type {
  CompleteGameCommand,
  CompletedGameRepository,
  SaveGameResult,
} from '../../services/game-save/completed-game-repository.ts';
import type { GameSessionRecord } from '../../repositories/game-session-repository.ts';
import { ReplayResolver } from '../../services/game-save/replay-resolver.ts';
import { StreakPolicy } from '../../services/game-save/streak-policy.ts';
import type { AnalyticsJobWriter } from '../../services/game-save/analytics-job-writer.ts';
import { PrismaAnalyticsJobWriter } from './prisma-analytics-job-writer.ts';
import { GameAttemptError } from '../../services/game-attempt.ts';


function toSessionRecord(session: GameSession): GameSessionRecord {
  return session as unknown as GameSessionRecord;
}

function toSaveUser(user: User) {
  return {
    id: user.id,
    experience: user.experience,
    streakDays: user.streakDays,
  };
}

/**
 * Prisma-backed implementation of CompletedGameRepository.
 * 
 * Executes the full game completion transaction:
 * - Replay detection and resolution
 * - Attempt reservation and consumption
 * - Session creation with metadata
 * - Analytics job persistence
 * - Analytics outbox entry
 * - User progress update (XP, level, streak)
 * - XpEvent creation
 */
export class PrismaCompletedGameRepository implements CompletedGameRepository {
  private replayResolver = new ReplayResolver();
  private streakPolicy = new StreakPolicy();

  constructor(
    private prisma: PrismaClient,
    private analyticsJobWriter: AnalyticsJobWriter = new PrismaAnalyticsJobWriter(),
  ) {}

  /**
   * Validates attempt contract: userId, challenge, gameType, clientRunId must match.
   */
  private validateAttemptContract(
    attempt: { userId: string; challengeDigest: string; gameType: string; clientRunId: string } | null,
    input: { userId: string; challenge?: string; gameType: string; clientRunId?: string },
  ): void {
    if (!attempt || attempt.userId !== input.userId || !input.challenge || !this.challengeMatches(input.challenge, attempt.challengeDigest)) {
      throw new GameAttemptError('Invalid game attempt credentials', 403, 'INVALID_ATTEMPT_CREDENTIALS');
    }
    if (attempt.gameType !== input.gameType || attempt.clientRunId !== input.clientRunId) {
      throw new GameAttemptError('Game attempt contract does not match', 409, 'ATTEMPT_CONTRACT_MISMATCH');
    }
  }

  /**
   * Validates attempt window: notBefore <= now < expiresAt.
   */
  private validateAttemptWindow(attempt: { notBefore: Date; expiresAt: Date }, now: Date): void {
    if (now < attempt.notBefore) {
      throw new GameAttemptError('Game attempt is not ready', 409, 'ATTEMPT_NOT_READY');
    }
    if (now >= attempt.expiresAt) {
      throw new GameAttemptError('Game attempt has expired', 409, 'ATTEMPT_EXPIRED');
    }
  }

  /**
   * Checks if a plaintext challenge matches the stored digest.
   */
  private challengeMatches(challenge: string, digest: string): boolean {
    // Import crypto for SHA-256 hashing
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(challenge).digest('hex');
    return hash === digest;
  }

  async complete(command: CompleteGameCommand): Promise<SaveGameResult> {
    const { input, score, analyticsJob } = command;
    const hasAttempt = Boolean(input.attemptId || input.challenge);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const now = new Date();
        let attempt: Awaited<ReturnType<typeof tx.gameAttempt.findUnique>> = null;

        // Handle attempt-based flow
        if (hasAttempt) {
          attempt = await tx.gameAttempt.findUnique({ where: { id: input.attemptId! } });

          // Validate attempt contract (credentials, gameType, clientRunId)
          this.validateAttemptContract(attempt, input);

          // Validate attempt window (notBefore, expiresAt)
          if (attempt) {
            this.validateAttemptWindow(attempt, now);
          }

          // Check if attempt already consumed (idempotency)
          if (attempt?.consumedAt || attempt?.gameSessionId) {
            if (!attempt.gameSessionId) {
              throw new GameAttemptError('Game attempt was already consumed', 409, 'ATTEMPT_ALREADY_CONSUMED');
            }
            const session = await tx.gameSession.findUnique({ where: { id: attempt.gameSessionId } });
            if (!session) {
              throw new GameAttemptError('Game attempt was already consumed', 409, 'ATTEMPT_ALREADY_CONSUMED');
            }
            this.replayResolver.assertReplayMatches(session, input, score);
            const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
            return { session: toSessionRecord(session), user: toSaveUser(user), isReplay: true };
          }

          // Reserve attempt atomically
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

          // Handle concurrent consumption
          if (reserved.count !== 1) {
            const concurrentAttempt = await tx.gameAttempt.findUnique({ where: { id: input.attemptId! } });
            if (concurrentAttempt?.gameSessionId) {
              const session = await tx.gameSession.findUnique({ where: { id: concurrentAttempt.gameSessionId } });
              if (session) {
                this.replayResolver.assertReplayMatches(session, input, score);
                const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
                return { session: toSessionRecord(session), user: toSaveUser(user), isReplay: true };
              }
            }
            throw new GameAttemptError('Game attempt was already consumed', 409, 'ATTEMPT_ALREADY_CONSUMED');
          }
        } else if (input.clientRunId) {
          // Handle legacy clientRunId-based replay
          const existingSession = await tx.gameSession.findUnique({
            where: { userId_clientRunId: { userId: input.userId, clientRunId: input.clientRunId } },
          });
          if (existingSession) {
            this.replayResolver.assertReplayMatches(existingSession, input, score);
            const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
            return { session: toSessionRecord(existingSession), user: toSaveUser(user), isReplay: true };
          }
        }

        // Create new session
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

        await this.analyticsJobWriter.write(tx, session.id, analyticsJob, now);

        // Link attempt to session
        if (hasAttempt) {
          await tx.gameAttempt.update({
            where: { id: input.attemptId! },
            data: { gameSessionId: session.id },
          });
        }

        // Update user progress
        let user = await tx.user.update({
          where: { id: input.userId },
          data: {
            experience: { increment: score },
            streakDays: this.streakPolicy.nextStreak(currentUser, now),
            lastPlayedAt: now,
            ...(input.metadata?.distraction && input.metadata.distraction !== 'none' ? {
              rating: { increment: Math.max(1, Math.floor(100000 / input.timeMs) - 5) },
            } : {}),
          },
        });

        // Update level if threshold crossed
        const currentLevel = Math.floor(user.experience / 500) + 1;
        if (currentLevel > user.level) {
          user = await tx.user.update({ where: { id: user.id }, data: { level: currentLevel } });
        }

        // Create XP event
        await tx.xpEvent.create({
          data: {
            userId: input.userId,
            gameSessionId: session.id,
            amount: score,
            reason: `game:${input.gameType}`,
          },
        });

        return { session: toSessionRecord(session), user: toSaveUser(user), isReplay: false };
      });
    } catch (error) {
      // Handle unique constraint violation on clientRunId (race condition)
      if (input.clientRunId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const session = await this.prisma.gameSession.findUnique({
          where: { userId_clientRunId: { userId: input.userId, clientRunId: input.clientRunId } },
        });
        if (session) {
          this.replayResolver.assertReplayMatches(session, input, score);
          const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
          if (user) {
            return { session: toSessionRecord(session), user: toSaveUser(user), isReplay: true };
          }
        }
      }
      throw error;
    }
  }
}
