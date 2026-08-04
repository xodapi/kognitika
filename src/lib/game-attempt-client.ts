import { useCallback, useEffect, useRef } from 'react';
import type { CompletedSessionAnalyticsJob } from '../core/cognitive-events';
import { createClientRunId } from './client-run-id';

export interface GameAttemptCredentials {
  attemptId: string;
  challenge: string;
  clientRunId: string;
  gameType: string;
  issuedAt: string;
  notBefore: string;
  expiresAt: string;
}

export interface GameSavePayload {
  timeMs: number;
  metadata?: Record<string, unknown>;
  isCompleted?: boolean;
  analyticsJob?: CompletedSessionAnalyticsJob;
}

export class GameAttemptError extends Error {}

export const GAME_ATTEMPT_AUTH_REQUIRED_EVENT = 'kognitika:game-attempt-auth-required' as const;

export function requestGameAttemptAuthentication(): void {
  window.dispatchEvent(new Event(GAME_ATTEMPT_AUTH_REQUIRED_EVENT));
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new GameAttemptError(`Game attempt request failed with status ${response.status}`);
  }
  return response.json();
}

export async function createGameAttempt(
  token: string,
  gameType: string,
  clientRunId = createClientRunId(),
  fetchImpl: typeof fetch = fetch,
): Promise<GameAttemptCredentials> {
  const response = await fetchImpl('/api/game/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ gameType, clientRunId }),
  });
  const data = await readJson(response) as Partial<GameAttemptCredentials>;
  if (!data.attemptId || !data.challenge || !data.issuedAt || !data.notBefore || !data.expiresAt) {
    throw new GameAttemptError('Game attempt response is incomplete');
  }
  return {
    attemptId: data.attemptId,
    challenge: data.challenge,
    issuedAt: data.issuedAt,
    notBefore: data.notBefore,
    expiresAt: data.expiresAt,
    gameType,
    clientRunId,
  };
}

export async function saveGameAttempt(
  token: string,
  credentials: GameAttemptCredentials,
  payload: GameSavePayload,
  fetchImpl: typeof fetch = fetch,
): Promise<any> {
  const response = await fetchImpl('/api/game/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      ...payload,
      clientRunId: credentials.clientRunId,
      gameType: credentials.gameType,
      attemptId: credentials.attemptId,
      challenge: credentials.challenge,
    }),
  });
  return readJson(response);
}

const RETRY_DELAY_MS = 1000;

export function useGameAttempt(token: string | null | undefined) {
  const credentialsRef = useRef<GameAttemptCredentials | null>(null);
  const generationRef = useRef(0);
  const savePromiseRef = useRef<Promise<any> | null>(null);
  const savedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      credentialsRef.current = null;
    };
  }, []);

  const beginAttempt = useCallback(async (gameType: string) => {
    if (!token) {
      requestGameAttemptAuthentication();
      throw new GameAttemptError('Authentication is required to start a game attempt');
    }
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    credentialsRef.current = null;
    savePromiseRef.current = null;
    savedRef.current = false;
    const credentials = await createGameAttempt(token, gameType);
    if (!mountedRef.current || generationRef.current !== generation) {
      throw new GameAttemptError('Game attempt start was superseded');
    }
    credentialsRef.current = credentials;
    return credentials;
  }, [token]);

  const saveAttempt = useCallback((payload: GameSavePayload): Promise<any> => {
    if (savedRef.current) return Promise.resolve(null);
    if (savePromiseRef.current) return savePromiseRef.current;
    const credentials = credentialsRef.current;
    if (!token || !credentials) {
      return Promise.reject(new GameAttemptError('No active game attempt is available'));
    }

    let savePromise: Promise<any>;
    const save = async () => {
      try {
        const result = await saveGameAttempt(token, credentials, payload);
        if (credentialsRef.current === credentials) savedRef.current = true;
        return result;
      } catch (firstError) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        if (!mountedRef.current || credentialsRef.current !== credentials) throw firstError;
        const result = await saveGameAttempt(token, credentials, payload);
        if (credentialsRef.current === credentials) savedRef.current = true;
        return result;
      } finally {
        if (savePromiseRef.current === savePromise) savePromiseRef.current = null;
      }
    };

    savePromise = save();
    savePromiseRef.current = savePromise;
    return savePromise;
  }, [token]);

  return { beginAttempt, saveAttempt };
}
