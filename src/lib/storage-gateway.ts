import { z, type ZodSchema } from 'zod';
import {
  APP_STATE_KEYS,
  IDENTITY_KEYS,
  LEGACY_IDENTITY_KEYS,
  STORAGE_SCHEMA_VERSION,
  STORAGE_SCHEMA_VERSION_KEY,
  matchesAnyStoragePattern,
} from './storage-keys';

export type StorageScope = 'app' | 'identity' | 'all';

export type StorageErrorCode =
  | 'storage_unavailable'
  | 'parse_failed'
  | 'schema_mismatch'
  | 'write_failed';

export interface StorageError {
  code: StorageErrorCode;
  key?: string;
  message: string;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: StorageError };

const schemaVersionSchema = z.number().int().positive();

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function patternsForScope(scope: StorageScope) {
  if (scope === 'app') return APP_STATE_KEYS;
  if (scope === 'identity') return [...IDENTITY_KEYS, ...LEGACY_IDENTITY_KEYS] as const;
  return [...APP_STATE_KEYS, ...IDENTITY_KEYS, ...LEGACY_IDENTITY_KEYS] as const;
}

function parseStoredValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export class BrowserStorageGateway {
  constructor(private readonly storageProvider: () => Storage | null = getBrowserStorage) {}

  get<T>(key: string, schema: ZodSchema<T>): Result<T | null> {
    const storage = this.storageProvider();
    if (!storage) {
      return {
        ok: false,
        error: { code: 'storage_unavailable', key, message: 'Browser storage is unavailable' },
      };
    }

    const raw = storage.getItem(key);
    if (raw === null) return { ok: true, value: null };

    const parsed = parseStoredValue(raw);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return {
        ok: false,
        error: { code: 'schema_mismatch', key, message: 'Stored value does not match schema' },
      };
    }

    return { ok: true, value: result.data };
  }

  set<T>(key: string, value: T, schema: ZodSchema<T>): Result<void> {
    const storage = this.storageProvider();
    if (!storage) {
      return {
        ok: false,
        error: { code: 'storage_unavailable', key, message: 'Browser storage is unavailable' },
      };
    }

    const result = schema.safeParse(value);
    if (!result.success) {
      return {
        ok: false,
        error: { code: 'schema_mismatch', key, message: 'Value does not match schema' },
      };
    }

    try {
      storage.setItem(key, JSON.stringify(result.data));
      return { ok: true, value: undefined };
    } catch {
      return {
        ok: false,
        error: { code: 'write_failed', key, message: 'Failed to write browser storage' },
      };
    }
  }

  remove(key: string): Result<void> {
    const storage = this.storageProvider();
    if (!storage) {
      return {
        ok: false,
        error: { code: 'storage_unavailable', key, message: 'Browser storage is unavailable' },
      };
    }

    storage.removeItem(key);
    return { ok: true, value: undefined };
  }

  clear(scope: StorageScope): void {
    const storage = this.storageProvider();
    if (!storage) return;

    const patterns = patternsForScope(scope);
    const keys: string[] = [];

    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && matchesAnyStoragePattern(key, patterns)) {
        keys.push(key);
      }
    }

    keys.forEach((key) => storage.removeItem(key));
  }

  ensureSchemaVersion(): void {
    const current = this.get(STORAGE_SCHEMA_VERSION_KEY, schemaVersionSchema);

    if (current.ok && current.value === STORAGE_SCHEMA_VERSION) return;

    if (!current.ok || current.value !== null) {
      this.clear('app');
    }

    this.set(STORAGE_SCHEMA_VERSION_KEY, STORAGE_SCHEMA_VERSION, schemaVersionSchema);
  }
}

export const storageGateway = new BrowserStorageGateway();
