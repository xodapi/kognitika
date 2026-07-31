import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameAttempt, GameAttemptError, saveGameAttempt } from '../lib/game-attempt-client';

const attemptResponse = {
  attemptId: 'attempt-1',
  challenge: 'one-time-secret',
  issuedAt: '2026-07-31T12:00:00.000Z',
  notBefore: '2026-07-31T12:00:01.000Z',
  expiresAt: '2026-07-31T12:05:00.000Z',
};

afterEach(() => vi.restoreAllMocks());

describe('game attempt client', () => {
  it('starts an authenticated attempt tied to the exact game type and client run', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(attemptResponse), { status: 200 }),
    );

    const credentials = await createGameAttempt(
      'token',
      'SCHULTE_GORBOV',
      '11111111-1111-4111-8111-111111111111',
      fetchImpl,
    );

    expect(credentials).toEqual({
      ...attemptResponse,
      gameType: 'SCHULTE_GORBOV',
      clientRunId: '11111111-1111-4111-8111-111111111111',
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/game/attempts');
    expect(init?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      gameType: 'SCHULTE_GORBOV',
      clientRunId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('saves with in-memory attempt credentials and preserves them for a retry', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ session: { id: 'session-1' } }), { status: 200 }));
    const credentials = {
      ...attemptResponse,
      gameType: 'STROOP',
      clientRunId: '22222222-2222-4222-8222-222222222222',
    };

    await expect(saveGameAttempt('token', credentials, { timeMs: 900, metadata: { score: 4 } }, fetchImpl))
      .rejects.toBeInstanceOf(GameAttemptError);
    await expect(saveGameAttempt('token', credentials, { timeMs: 900, metadata: { score: 4 } }, fetchImpl))
      .resolves.toEqual({ session: { id: 'session-1' } });

    for (const [, init] of fetchImpl.mock.calls) {
      expect(JSON.parse(String(init?.body))).toEqual({
        timeMs: 900,
        metadata: { score: 4 },
        clientRunId: credentials.clientRunId,
        gameType: 'STROOP',
        attemptId: 'attempt-1',
        challenge: 'one-time-secret',
      });
    }
  });

  it('fails closed when the attempt response omits its challenge', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ...attemptResponse, challenge: undefined }), { status: 200 }),
    );

    await expect(createGameAttempt('token', 'N_BACK', undefined, fetchImpl))
      .rejects.toBeInstanceOf(GameAttemptError);
  });
});
