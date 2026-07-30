/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  gameAttempt: { create: vi.fn() },
}));

vi.mock('../lib/prisma.ts', () => ({ default: prismaMock }));

describe('game attempt challenge creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GAME_ATTEMPT_TTL_SECONDS = '900';
    process.env.GAME_ATTEMPT_NOT_BEFORE_MS = '0';
    prismaMock.gameAttempt.create.mockImplementation(({ data }: any) => ({
      id: 'attempt-a', ...data,
    }));
  });

  it('stores only a SHA-256 digest and returns the raw random challenge once', async () => {
    const { digestGameChallenge, startGameAttempt } = await import('../server/services/game-attempt.ts');
    const result = await startGameAttempt({
      userId: 'user-a', gameType: 'SCHULTE',
      clientRunId: '11111111-1111-4111-8111-111111111111',
    });
    const createData = prismaMock.gameAttempt.create.mock.calls[0][0].data;

    expect(result.challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.challenge.length).toBeGreaterThanOrEqual(40);
    expect(createData.challenge).toBeUndefined();
    expect(createData.challengeDigest).toBe(digestGameChallenge(result.challenge));
    expect(createData.challengeDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(result.expiresAt.getTime() - result.issuedAt.getTime()).toBe(900_000);
  });
});
