import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BrowserStorageGateway } from '../lib/storage-gateway';
import {
  AUTH_TOKEN_KEY,
  BRAIN_ID_KEY,
  LEGACY_AUTH_TOKEN_KEY,
  LEGACY_AUTH_USER_KEY,
  STORAGE_SCHEMA_VERSION,
  STORAGE_SCHEMA_VERSION_KEY,
} from '../lib/storage-keys';

describe('BrowserStorageGateway', () => {
  const gateway = new BrowserStorageGateway(() => window.localStorage);

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns a schema error instead of throwing for malformed stored objects', () => {
    window.localStorage.setItem('kognitika:session:user', '{bad-json');

    const result = gateway.get('kognitika:session:user', z.object({ id: z.string() }));

    expect(result.ok).toBe(false);
    if ('error' in result) {
      expect(result.error.code).toBe('schema_mismatch');
    }
  });

  it('validates writes before persisting values', () => {
    const result = gateway.set('kognitika:ui:theme', 'dark', z.enum(['light', 'dark']));

    expect(result.ok).toBe(true);
    expect(window.localStorage.getItem('kognitika:ui:theme')).toBe('"dark"');
  });

  it('clear app removes app-state keys and preserves identity and schema keys', () => {
    window.localStorage.setItem('kognitika:ui:theme', '"dark"');
    window.localStorage.setItem('kognitika:session:lastRoute', '"/"');
    window.localStorage.setItem('kognitika:cache:dashboard', '{}');
    window.localStorage.setItem(BRAIN_ID_KEY, '"BR-SYNTHETIC-001"');
    window.localStorage.setItem(AUTH_TOKEN_KEY, '"synthetic-token"');
    window.localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, '"legacy-token"');
    window.localStorage.setItem(LEGACY_AUTH_USER_KEY, '{"id":"u1","name":"Synthetic"}');
    window.localStorage.setItem(STORAGE_SCHEMA_VERSION_KEY, String(STORAGE_SCHEMA_VERSION));

    gateway.clear('app');

    expect(window.localStorage.getItem('kognitika:ui:theme')).toBeNull();
    expect(window.localStorage.getItem('kognitika:session:lastRoute')).toBeNull();
    expect(window.localStorage.getItem('kognitika:cache:dashboard')).toBeNull();
    expect(window.localStorage.getItem(BRAIN_ID_KEY)).toBe('"BR-SYNTHETIC-001"');
    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBe('"synthetic-token"');
    expect(window.localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)).toBe('"legacy-token"');
    expect(window.localStorage.getItem(LEGACY_AUTH_USER_KEY)).toBe('{"id":"u1","name":"Synthetic"}');
    expect(window.localStorage.getItem(STORAGE_SCHEMA_VERSION_KEY)).toBe(String(STORAGE_SCHEMA_VERSION));
  });

  it('clear identity removes only identity keys', () => {
    window.localStorage.setItem('kognitika:ui:theme', '"dark"');
    window.localStorage.setItem(BRAIN_ID_KEY, '"BR-SYNTHETIC-001"');
    window.localStorage.setItem(AUTH_TOKEN_KEY, '"synthetic-token"');
    window.localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, '"legacy-token"');
    window.localStorage.setItem(LEGACY_AUTH_USER_KEY, '{"id":"u1","name":"Synthetic"}');

    gateway.clear('identity');

    expect(window.localStorage.getItem('kognitika:ui:theme')).toBe('"dark"');
    expect(window.localStorage.getItem(BRAIN_ID_KEY)).toBeNull();
    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_AUTH_USER_KEY)).toBeNull();
  });

  it('clear all preserves schema keys for migrations', () => {
    window.localStorage.setItem('kognitika:ui:theme', '"dark"');
    window.localStorage.setItem(BRAIN_ID_KEY, '"BR-SYNTHETIC-001"');
    window.localStorage.setItem(STORAGE_SCHEMA_VERSION_KEY, String(STORAGE_SCHEMA_VERSION));

    gateway.clear('all');

    expect(window.localStorage.getItem('kognitika:ui:theme')).toBeNull();
    expect(window.localStorage.getItem(BRAIN_ID_KEY)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_SCHEMA_VERSION_KEY)).toBe(String(STORAGE_SCHEMA_VERSION));
  });

  it('schema migration clears app-state and preserves identity keys', () => {
    window.localStorage.setItem('kognitika:ui:theme', '"dark"');
    window.localStorage.setItem(BRAIN_ID_KEY, '"BR-SYNTHETIC-001"');
    window.localStorage.setItem(STORAGE_SCHEMA_VERSION_KEY, '0');

    gateway.ensureSchemaVersion();

    expect(window.localStorage.getItem('kognitika:ui:theme')).toBeNull();
    expect(window.localStorage.getItem(BRAIN_ID_KEY)).toBe('"BR-SYNTHETIC-001"');
    expect(window.localStorage.getItem(STORAGE_SCHEMA_VERSION_KEY)).toBe(String(STORAGE_SCHEMA_VERSION));
  });

  it('get returns null for non-existent key', () => {
    const result = gateway.get('kognitika:nonexistent', z.string());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });

  it('set rejects schema-invalid values', () => {
    const result = gateway.set('kognitika:ui:theme', 'invalid-value', z.enum(['light', 'dark']));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('schema_mismatch');
    }
  });

  it('returns storage_unavailable error when storage provider returns null', () => {
    const noop = () => null;
    const offline = new BrowserStorageGateway(noop);

    const getResult = offline.get('kognitika:test', z.string());
    expect(getResult.ok).toBe(false);
    if (!getResult.ok) {
      expect(getResult.error.code).toBe('storage_unavailable');
    }

    const setResult = offline.set('kognitika:test', 'value', z.string());
    expect(setResult.ok).toBe(false);
    if (!setResult.ok) {
      expect(setResult.error.code).toBe('storage_unavailable');
    }

    const removeResult = offline.remove('kognitika:test');
    expect(removeResult.ok).toBe(false);
    if (!removeResult.ok) {
      expect(removeResult.error.code).toBe('storage_unavailable');
    }
  });

  it('ensureSchemaVersion is a no-op when schema is current', () => {
    window.localStorage.setItem(STORAGE_SCHEMA_VERSION_KEY, String(STORAGE_SCHEMA_VERSION));
    window.localStorage.setItem('kognitika:ui:theme', '"dark"');

    gateway.ensureSchemaVersion();

    expect(window.localStorage.getItem('kognitika:ui:theme')).toBe('"dark"');
    expect(window.localStorage.getItem(STORAGE_SCHEMA_VERSION_KEY)).toBe(String(STORAGE_SCHEMA_VERSION));
  });
});
