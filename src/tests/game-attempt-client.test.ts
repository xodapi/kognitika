import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createGameAttempt,
  GAME_ATTEMPT_AUTH_REQUIRED_EVENT,
  GameAttemptError,
  requestGameAttemptAuthentication,
  saveGameAttempt,
  useGameAttempt,
} from '../lib/game-attempt-client';

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

  it('surfaces a server-side 500 without exposing the response body', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Failed to save session', detail: 'relation does not exist' }), { status: 500 }),
    );
    const credentials = {
      ...attemptResponse,
      gameType: 'SCHULTE',
      clientRunId: '33333333-3333-4333-8333-333333333333',
    };

    await expect(saveGameAttempt('token', credentials, { timeMs: 900 }, fetchImpl))
      .rejects.toThrow('status 500');
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('retries a failed save exactly once and preserves attempt credentials', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(attemptResponse), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Failed to save session' }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Failed to save session' }), { status: 500 }));
    vi.stubGlobal('fetch', fetchImpl);

    try {
      const { result } = renderHook(() => useGameAttempt('token'));
      await act(async () => {
        await result.current.beginAttempt(
          'SCHULTE',
        );
      });

      const savePromise = result.current.saveAttempt({ timeMs: 900 });
      const settledSave = savePromise.then(
        () => null,
        (error) => error,
      );
      await vi.advanceTimersByTimeAsync(1000);
      await expect(settledSave).resolves.toMatchObject({ message: 'Game attempt request failed with status 500' });
      expect(fetchImpl).toHaveBeenCalledTimes(3);

      const saveBodies = fetchImpl.mock.calls.slice(1).map(([, init]) => JSON.parse(String(init?.body)));
      expect(saveBodies[0]).toMatchObject({
        clientRunId: expect.any(String),
        gameType: 'SCHULTE',
        attemptId: attemptResponse.attemptId,
        challenge: attemptResponse.challenge,
      });
      expect(saveBodies[1]).toEqual(saveBodies[0]);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it('requests the shared authentication modal without carrying private data', () => {
    const listener = vi.fn();
    window.addEventListener(GAME_ATTEMPT_AUTH_REQUIRED_EVENT, listener);

    requestGameAttemptAuthentication();

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0]).toEqual(expect.objectContaining({ type: GAME_ATTEMPT_AUTH_REQUIRED_EVENT }));
    window.removeEventListener(GAME_ATTEMPT_AUTH_REQUIRED_EVENT, listener);
  });

  it('fails closed when the attempt response omits its challenge', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ...attemptResponse, challenge: undefined }), { status: 200 }),
    );

    await expect(createGameAttempt('token', 'N_BACK', undefined, fetchImpl))
      .rejects.toBeInstanceOf(GameAttemptError);
  });
});
