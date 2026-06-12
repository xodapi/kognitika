export const STORAGE_SCHEMA_VERSION = 1;

export const APP_STATE_KEYS = [
  'kognitika:ui:*',
  'kognitika:session:*',
  'kognitika:cache:*',
] as const;

export const IDENTITY_KEYS = [
  'kognitika:brainId',
  'kognitika:auth:token',
  'kognitika:auth:refresh',
] as const;

export const SCHEMA_KEYS = [
  'kognitika:storage:schemaVersion',
] as const;

export const STORAGE_SCHEMA_VERSION_KEY = SCHEMA_KEYS[0];
export const AUTH_TOKEN_KEY = IDENTITY_KEYS[1];
export const AUTH_REFRESH_KEY = IDENTITY_KEYS[2];
export const BRAIN_ID_KEY = IDENTITY_KEYS[0];

export const LEGACY_AUTH_TOKEN_KEY = 'token';
export const LEGACY_AUTH_USER_KEY = 'user';
export const LEGACY_IDENTITY_KEYS = [
  LEGACY_AUTH_TOKEN_KEY,
  LEGACY_AUTH_USER_KEY,
] as const;

export type StoragePattern =
  | typeof APP_STATE_KEYS[number]
  | typeof IDENTITY_KEYS[number]
  | typeof LEGACY_IDENTITY_KEYS[number]
  | typeof SCHEMA_KEYS[number];

export function matchesStoragePattern(key: string, pattern: StoragePattern): boolean {
  if (pattern.endsWith('*')) {
    return key.startsWith(pattern.slice(0, -1));
  }

  return key === pattern;
}

export function matchesAnyStoragePattern(key: string, patterns: readonly StoragePattern[]): boolean {
  return patterns.some((pattern) => matchesStoragePattern(key, pattern));
}
