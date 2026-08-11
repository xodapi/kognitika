/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const transactionClient = vi.hoisted(() => ({
  gameAttempt: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  gameSession: { findUnique: vi.fn(), create: vi.fn() },
  user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  xpEvent: { create: vi.fn() },
  completedSessionAnalyticsJob: { create: vi.fn() },
  analyticsOutboxEntry: { create: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
  gameSession: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('../lib/prisma.ts', () => ({ default: prismaMock }));

describe('legacy game-save characterization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.GAME_SAVE_LEGACY_COMPAT_ENABLED = 'true';
    process.env.ANALYTICS_OUTBOX_SHADOW_ENABLED = 'false';
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient),
    );
    transactionClient.gameAttempt.findUnique.mockResolvedValue(null);
    transactionClient.gameSession.findUnique.mockResolvedValue(null);
    transactionClient.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-a',
      experience: 100,
      level: 1,
      streakDays: 0,
      lastPlayedAt: null,
    });
    transactionClient.gameSession.create.mockResolvedValue({
      id: 'legacy-session-a',
      userId: 'user-a',
      gameType: 'SCHULTE',
      score: 21,
    });
    transactionClient.user.update.mockResolvedValue({
      id: 'user-a',
      experience: 121,
      level: 1,
      streakDays: 1,
      lastPlayedAt: new Date(),
    });
  });

  it('requires an attempt when legacy compatibility is disabled', async () => {
    process.env.GAME_SAVE_LEGACY_COMPAT_ENABLED = 'false';
    const { saveCompletedGame } = await import('../server/services/game-save-legacy.ts');

    await expect(saveCompletedGame({
      userId: 'user-a',
      gameType: 'SCHULTE',
      timeMs: 5_000,
    })).rejects.toMatchObject({
      code: 'ATTEMPT_REQUIRED',
      status: 400,
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  }, 20_000);

  it('rejects incomplete attempt credentials before persistence', async () => {
    const { saveCompletedGame } = await import('../server/services/game-save-legacy.ts');

    await expect(saveCompletedGame({
      userId: 'user-a',
      attemptId: 'attempt-a',
      gameType: 'SCHULTE',
      timeMs: 5_000,
    })).rejects.toMatchObject({
      code: 'INCOMPLETE_ATTEMPT',
      status: 400,
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  }, 20_000);

  it('creates a completed session and awards XP once', async () => {
    const { saveCompletedGame } = await import('../server/services/game-save-legacy.ts');

    const result = await saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5_000,
      metadata: { size: 3 },
    });

    expect(result.isReplay).toBe(false);
    expect(transactionClient.gameSession.create).toHaveBeenCalledOnce();
    expect(transactionClient.user.update).toHaveBeenCalledOnce();
    expect(transactionClient.xpEvent.create).toHaveBeenCalledOnce();
  }, 20_000);

  it('rejects an expired attempt without creating a session or awarding XP', async () => {
    const { digestGameChallenge, saveCompletedGame } = await import('../server/services/game-save-legacy.ts')
      .then(async ({ saveCompletedGame }) => ({
        saveCompletedGame,
        ...(await import('../server/services/game-attempt.ts')),
      }));
    const challenge = 'synthetic-legacy-challenge';
    transactionClient.gameAttempt.findUnique.mockResolvedValue({
      id: 'attempt-a',
      userId: 'user-a',
      gameType: 'SCHULTE',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      challengeDigest: digestGameChallenge(challenge),
      consumedAt: null,
      gameSessionId: null,
      notBefore: new Date(Date.now() - 120_000),
      expiresAt: new Date(Date.now() - 60_000),
    });

    await expect(saveCompletedGame({
      userId: 'user-a',
      attemptId: 'attempt-a',
      challenge,
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5_000,
    })).rejects.toMatchObject({ code: 'ATTEMPT_EXPIRED', status: 409 });
    expect(transactionClient.gameSession.create).not.toHaveBeenCalled();
    expect(transactionClient.xpEvent.create).not.toHaveBeenCalled();
  }, 20_000);

  it('rejects an invalid canonical analytics job before persistence', async () => {
    const { saveCompletedGame } = await import('../server/services/game-save-legacy.ts');
    const job = {
      schemaVersion: 1,
      jobId: 'legacy-job-mismatch',
      analyzerVersion: 'analyze-session-v1',
      receivedAt: '2026-08-04T00:00:02.000Z',
      sessionId: 'legacy-browser-session',
      moduleId: 'nback',
      moduleVersion: '1',
      category: 'cognitive',
      startedAt: '2026-08-04T00:00:00.000Z',
      completedAt: '2026-08-04T00:00:01.000Z',
      events: [
        { schemaVersion: 1, eventId: 'legacy-browser-session:0', sessionId: 'legacy-browser-session', moduleId: 'nback', moduleVersion: '1', category: 'cognitive', sequence: 0, tMs: 0, kind: 'trial_started', trialType: 'nback:trial' },
        { schemaVersion: 1, eventId: 'legacy-browser-session:1', sessionId: 'legacy-browser-session', moduleId: 'nback', moduleVersion: '1', category: 'cognitive', sequence: 1, tMs: 1_000, kind: 'session_completed', completedAt: '2026-08-04T00:00:01.000Z' },
      ],
    };

    await expect(saveCompletedGame({
      userId: 'user-a',
      gameType: 'SCHULTE',
      timeMs: 5_000,
      analyticsJob: job,
    })).rejects.toMatchObject({ code: 'INVALID_ANALYTICS_JOB', status: 400 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  }, 20_000);
});
