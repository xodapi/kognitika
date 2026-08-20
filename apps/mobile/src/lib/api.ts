import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { BrainIdPayload } from '@kognitika/shared-types';
import { resolveMobileApiOrigin } from './api-origin';
import { createSafeLogger } from './safe-logger';

const API_URL = resolveMobileApiOrigin(process.env.EXPO_PUBLIC_API_URL, process.env.NODE_ENV);
const logger = createSafeLogger('mobile-api');

const TOKEN_KEY = 'kognitika-jwt';
const BRAIN_ID_KEY = 'kognitika-brain-id';
const LEGACY_TOKEN_KEY = '@kognitika/jwt';
const LEGACY_BRAIN_ID_KEY = '@kognitika/brain-id';
const PSEUDONYM_KEY = '@kognitika/pseudonym';

async function saveCredentials(token: string, brainId: string) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(BRAIN_ID_KEY, brainId),
    AsyncStorage.multiRemove([LEGACY_TOKEN_KEY, LEGACY_BRAIN_ID_KEY]),
  ]);
}

async function secureCredential(key: string, legacyKey: string) {
  const secureValue = await SecureStore.getItemAsync(key);
  if (secureValue) return secureValue;

  const legacyValue = await AsyncStorage.getItem(legacyKey);
  if (!legacyValue) return null;
  await SecureStore.setItemAsync(key, legacyValue);
  await AsyncStorage.removeItem(legacyKey);
  return legacyValue;
}

async function getHeaders(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Войти по существующему Brain ID
export async function loginWithBrainId(payload: BrainIdPayload): Promise<{ token: string; brainId: string }> {
  const res = await fetch(`${API_URL}/api/auth/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brainId: payload.brainId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Network error' }));
    throw new Error(err.message || `Auth failed: ${res.status}`);
  }

  const data = await res.json();
  await saveCredentials(data.token, data.brainId || payload.brainId);
  await AsyncStorage.setItem(PSEUDONYM_KEY, data.pseudonym || '');
  return data;
}

// Создать новую анонимную Brain сессию
export async function createNewBrainSession(): Promise<{ token: string; brainId: string; pseudonym: string }> {
  const res = await fetch(`${API_URL}/api/auth/brain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Network error' }));
    throw new Error(err.message || `Failed to create session: ${res.status}`);
  }

  const data = await res.json();
  await saveCredentials(data.token, data.brainId);
  await AsyncStorage.setItem(PSEUDONYM_KEY, data.pseudonym || '');
  return data;
}

export async function getStoredBrainId(): Promise<string | null> {
  return secureCredential(BRAIN_ID_KEY, LEGACY_BRAIN_ID_KEY);
}

export async function getStoredPseudonym(): Promise<string | null> {
  return AsyncStorage.getItem(PSEUDONYM_KEY);
}

export async function getStoredToken(): Promise<string | null> {
  return secureCredential(TOKEN_KEY, LEGACY_TOKEN_KEY);
}

export async function fetchUserProfile(): Promise<any> {
  const token = await getStoredToken();
  if (!token) return null;

  const res = await fetch(`${API_URL}/api/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Profile fetch failed: ${res.status}`);
  }

  const data = await res.json();
  if (data.user?.pseudonym) {
    await AsyncStorage.setItem(PSEUDONYM_KEY, data.user.pseudonym);
  }
  return data;
}

export async function clearAuth(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(BRAIN_ID_KEY),
    AsyncStorage.multiRemove([LEGACY_TOKEN_KEY, LEGACY_BRAIN_ID_KEY, PSEUDONYM_KEY]),
  ]);
}

export interface GameAttemptCredentials {
  attemptId: string;
  challenge: string;
}

export async function createGameAttempt(
  gameType: string,
  clientRunId: string,
): Promise<GameAttemptCredentials> {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/api/game/attempts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ gameType, clientRunId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null) as { error?: string; message?: string } | null;
    throw new Error(error?.error || error?.message || `Failed to create game attempt: ${res.status}`);
  }

  const data = await res.json() as Partial<GameAttemptCredentials>;
  if (!data.attemptId || !data.challenge) {
    throw new Error('Game attempt response is incomplete');
  }

  return { attemptId: data.attemptId, challenge: data.challenge };
}

export async function submitGameResult(result: {
  attemptId: string;
  challenge: string;
  clientRunId: string;
  type: string;
  size?: number;
  timeMs: number;
  accuracy: number;
  errors: number;
}): Promise<void> {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/api/game/save`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      attemptId: result.attemptId,
      challenge: result.challenge,
      clientRunId: result.clientRunId,
      gameType: result.type,
      timeMs: result.timeMs,
      metadata: {
        size: result.size,
        accuracy: result.accuracy,
        errors: result.errors,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null) as { error?: string; message?: string } | null;
    throw new Error(error?.error || error?.message || `Failed to submit game result: ${res.status}`);
  }
}

export async function submitPracticeRecommended(payload: {
  category: string;
  moduleId: string;
  reason: string;
  sourceSessionId: string;
}): Promise<void> {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/api/events/practice-recommended`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    logger.warn('Practice recommendation event was not accepted');
  }
}
