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
});
