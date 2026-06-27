import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BrainIdPayload } from '@kognitika/shared-types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const TOKEN_KEY = '@kognitika/jwt';
const BRAIN_ID_KEY = '@kognitika/brain-id';

async function getHeaders(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
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
  await AsyncStorage.setItem(TOKEN_KEY, data.token);
  await AsyncStorage.setItem(BRAIN_ID_KEY, data.brainId || payload.brainId);
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
  await AsyncStorage.setItem(TOKEN_KEY, data.token);
  await AsyncStorage.setItem(BRAIN_ID_KEY, data.brainId);
  return data;
}

export async function getStoredBrainId(): Promise<string | null> {
  return AsyncStorage.getItem(BRAIN_ID_KEY);
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, BRAIN_ID_KEY]);
}

export async function submitGameResult(result: {
  type: string;
  size?: number;
  timeMs: number;
  accuracy: number;
  score: number;
  errors: number;
}): Promise<void> {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/api/game/result`, {
    method: 'POST',
    headers,
    body: JSON.stringify(result),
  });

  if (!res.ok) {
    console.warn('Failed to submit game result:', res.status);
  }
}
