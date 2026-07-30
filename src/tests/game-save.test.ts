/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const transactionClient = vi.hoisted(() => ({
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
    prismaMock.$transaction.mockImplementation((callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient));
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
      id: 'session-a', userId: 'user-a', gameType: 'SCHULTE', timeMs: 5000, score: 21,
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
      id: 'session-a', userId: 'user-a', gameType: 'SCHULTE', timeMs: 5000, score: 21,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');

    await expect(saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 6000,
    })).rejects.toThrow('idempotency conflict');
    expect(transactionClient.xpEvent.create).not.toHaveBeenCalled();
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
