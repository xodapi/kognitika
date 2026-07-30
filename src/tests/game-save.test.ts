/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const transactionClient = vi.hoisted(() => ({
  gameAttempt: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  gameSession: { findUnique: vi.fn(), create: vi.fn() },
  user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  xpEvent: { create: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
  gameSession: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('../lib/prisma.ts', () => ({ default: prismaMock }));

describe('game save idempotency service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GAME_SAVE_LEGACY_COMPAT_ENABLED = 'true';
    prismaMock.$transaction.mockImplementation((callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient));
    transactionClient.gameAttempt.findUnique.mockResolvedValue(null);
    transactionClient.gameAttempt.updateMany.mockResolvedValue({ count: 1 });
    transactionClient.gameAttempt.update.mockResolvedValue({});
    transactionClient.gameSession.findUnique.mockResolvedValue(null);
    transactionClient.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-a', experience: 100, level: 1, streakDays: 0, lastPlayedAt: null,
    });
    transactionClient.gameSession.create.mockResolvedValue({
      id: 'session-a', userId: 'user-a', clientRunId: '11111111-1111-4111-8111-111111111111', score: 21,
    });
    transactionClient.user.update.mockResolvedValue({
      id: 'user-a', experience: 121, level: 1, streakDays: 1, lastPlayedAt: new Date(),
    });
    transactionClient.xpEvent.create.mockResolvedValue({ id: 'xp-a' });
  });

  it('awards XP once and links it to the created session', async () => {
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    const result = await saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5000,
      metadata: { size: 3 },
    });

    expect(result.isReplay).toBe(false);
    expect(transactionClient.user.update).toHaveBeenCalledOnce();
    expect(transactionClient.xpEvent.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-a',
        gameSessionId: 'session-a',
        amount: 21,
        reason: 'game:SCHULTE',
      },
    });
  });

  it('returns the existing session without another XP award', async () => {
    transactionClient.gameSession.findUnique.mockResolvedValue({
      id: 'session-a', userId: 'user-a', clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000, score: 21,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    const result = await saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5000,
    });

    expect(result.isReplay).toBe(true);
    expect(result.session.id).toBe('session-a');
    expect(transactionClient.gameSession.create).not.toHaveBeenCalled();
    expect(transactionClient.user.update).not.toHaveBeenCalled();
    expect(transactionClient.xpEvent.create).not.toHaveBeenCalled();
  });

  it('rejects a reused clientRunId with conflicting performance data', async () => {
    transactionClient.gameSession.findUnique.mockResolvedValue({
      id: 'session-a', userId: 'user-a', clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000, score: 21,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');

    await expect(saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 6000,
    })).rejects.toMatchObject({ code: 'ATTEMPT_REPLAY_CONFLICT' });
    expect(transactionClient.xpEvent.create).not.toHaveBeenCalled();
  });

  it('consumes a valid challenge once and links the attempt to the session', async () => {
    const { digestGameChallenge } = await import('../server/services/game-attempt.ts');
    const challenge = 'synthetic-secret-challenge';
    transactionClient.gameAttempt.findUnique.mockResolvedValue({
      id: 'attempt-a', userId: 'user-a', gameType: 'SCHULTE',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      challengeDigest: digestGameChallenge(challenge),
      notBefore: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 60000),
      consumedAt: null, gameSessionId: null,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');

    const result = await saveCompletedGame({
      userId: 'user-a', attemptId: 'attempt-a', challenge,
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000,
    });

    expect(result.isReplay).toBe(false);
    expect(transactionClient.gameAttempt.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'attempt-a', userId: 'user-a', consumedAt: null }),
    }));
    expect(transactionClient.gameAttempt.update).toHaveBeenCalledWith({
      where: { id: 'attempt-a' }, data: { gameSessionId: 'session-a' },
    });
    expect(transactionClient.xpEvent.create).toHaveBeenCalledOnce();
  });

  it.each([
    ['wrong owner', { userId: 'user-b' }, 'expected', 'INVALID_ATTEMPT_CREDENTIALS'],
    ['wrong challenge', {}, 'wrong', 'INVALID_ATTEMPT_CREDENTIALS'],
    ['wrong type', { gameType: 'STROOP' }, 'expected', 'ATTEMPT_CONTRACT_MISMATCH'],
    ['wrong run', { clientRunId: '22222222-2222-4222-8222-222222222222' }, 'expected', 'ATTEMPT_CONTRACT_MISMATCH'],
  ])('rejects %s without awarding XP', async (_label, attemptPatch, suppliedChallenge, code) => {
    const { digestGameChallenge } = await import('../server/services/game-attempt.ts');
    transactionClient.gameAttempt.findUnique.mockResolvedValue({
      id: 'attempt-a', userId: 'user-a', gameType: 'SCHULTE',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      challengeDigest: digestGameChallenge('expected'),
      notBefore: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 60000),
      consumedAt: null, gameSessionId: null, ...attemptPatch,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    await expect(saveCompletedGame({
      userId: 'user-a', attemptId: 'attempt-a', challenge: suppliedChallenge,
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000,
    })).rejects.toMatchObject({ code });
    expect(transactionClient.xpEvent.create).not.toHaveBeenCalled();
  });

  it.each([
    ['not ready', new Date(Date.now() + 60000), new Date(Date.now() + 120000), 'ATTEMPT_NOT_READY'],
    ['expired', new Date(Date.now() - 120000), new Date(Date.now() - 60000), 'ATTEMPT_EXPIRED'],
  ])('rejects a %s attempt', async (_label, notBefore, expiresAt, code) => {
    const { digestGameChallenge } = await import('../server/services/game-attempt.ts');
    transactionClient.gameAttempt.findUnique.mockResolvedValue({
      id: 'attempt-a', userId: 'user-a', gameType: 'SCHULTE',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      challengeDigest: digestGameChallenge('expected'), notBefore, expiresAt,
      consumedAt: null, gameSessionId: null,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    await expect(saveCompletedGame({
      userId: 'user-a', attemptId: 'attempt-a', challenge: 'expected',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000,
    })).rejects.toMatchObject({ code });
  });

  it('returns a matching consumed attempt idempotently without duplicate XP', async () => {
    const { digestGameChallenge } = await import('../server/services/game-attempt.ts');
    transactionClient.gameAttempt.findUnique.mockResolvedValue({
      id: 'attempt-a', userId: 'user-a', gameType: 'SCHULTE',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      challengeDigest: digestGameChallenge('expected'),
      notBefore: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 60000),
      consumedAt: new Date(), gameSessionId: 'session-a',
    });
    transactionClient.gameSession.findUnique.mockResolvedValue({
      id: 'session-a', userId: 'user-a', clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000, score: 21,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    const result = await saveCompletedGame({
      userId: 'user-a', attemptId: 'attempt-a', challenge: 'expected',
      clientRunId: '11111111-1111-4111-8111-111111111111', gameType: 'SCHULTE', timeMs: 5000,
    });
    expect(result.isReplay).toBe(true);
    expect(transactionClient.user.update).not.toHaveBeenCalled();
    expect(transactionClient.xpEvent.create).not.toHaveBeenCalled();
  });

  it('rejects a conflicting consumed attempt replay', async () => {
    const { digestGameChallenge } = await import('../server/services/game-attempt.ts');
    transactionClient.gameAttempt.findUnique.mockResolvedValue({
      id: 'attempt-a', userId: 'user-a', gameType: 'SCHULTE',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      challengeDigest: digestGameChallenge('expected'),
      notBefore: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 60000),
      consumedAt: new Date(), gameSessionId: 'session-a',
    });
    transactionClient.gameSession.findUnique.mockResolvedValue({
      id: 'session-a', userId: 'user-a', clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 6000, score: 17,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    await expect(saveCompletedGame({
      userId: 'user-a', attemptId: 'attempt-a', challenge: 'expected',
      clientRunId: '11111111-1111-4111-8111-111111111111', gameType: 'SCHULTE', timeMs: 5000,
    })).rejects.toMatchObject({ code: 'ATTEMPT_REPLAY_CONFLICT' });
  });

  it('requires an attempt when legacy compatibility is disabled', async () => {
    process.env.GAME_SAVE_LEGACY_COMPAT_ENABLED = 'false';
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    await expect(saveCompletedGame({
      userId: 'user-a', clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000,
    })).rejects.toMatchObject({ code: 'ATTEMPT_REQUIRED' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('keeps the level update inside the award transaction', async () => {
    transactionClient.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-a', experience: 490, level: 1, streakDays: 0, lastPlayedAt: null,
    });
    transactionClient.user.update
      .mockResolvedValueOnce({ id: 'user-a', experience: 511, level: 1, streakDays: 1 })
      .mockResolvedValueOnce({ id: 'user-a', experience: 511, level: 2, streakDays: 1 });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');

    await saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5000,
    });

    expect(transactionClient.user.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'user-a' },
      data: { level: 2 },
    });
  });
});
