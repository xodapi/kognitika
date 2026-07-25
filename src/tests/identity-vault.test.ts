import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createIdentityVault } from '../lib/identity-vault';
import { BrowserStorageGateway } from '../lib/storage-gateway';
import {
  AUTH_TOKEN_KEY,
  BRAIN_ID_KEY,
  LEGACY_AUTH_TOKEN_KEY,
  LEGACY_AUTH_USER_KEY,
} from '../lib/storage-keys';

function createSecureStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set('kognitika.identity.v1', initial);

  return {
    values,
    adapter: {
      get: vi.fn(async ({ key }: { key: string }) => {
        const value = values.get(key);
        if (value === undefined) throw new Error('missing');
        return { value };
      }),
      set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
        values.set(key, value);
        return { value: true };
      }),
      remove: vi.fn(async ({ key }: { key: string }) => {
        values.delete(key);
        return { value: true };
      }),
      keys: vi.fn(async () => ({ value: [...values.keys()] })),
    },
  };
}

describe('identity vault', () => {
  const browser = new BrowserStorageGateway(() => window.localStorage);

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('preserves browser identity persistence behavior', async () => {
    const vault = createIdentityVault({ native: false, browser });
    const record = {
      token: 'synthetic-token',
      user: { id: 'user-1', brainId: 'BR-SYNTHETIC-001' },
      brainId: 'BR-SYNTHETIC-001',
    };

    await vault.save(record);

    await expect(vault.load()).resolves.toEqual(record);
    expect(browser.get(AUTH_TOKEN_KEY, z.string())).toEqual({
      ok: true,
      value: 'synthetic-token',
    });
  });

  it('migrates browser identity to native secure storage once', async () => {
    browser.set(LEGACY_AUTH_TOKEN_KEY, 'legacy-token', z.string());
    browser.set(
      LEGACY_AUTH_USER_KEY,
      { id: 'user-1', brainId: 'BR-SYNTHETIC-001' },
      z.unknown(),
    );
    browser.set(BRAIN_ID_KEY, 'BR-SYNTHETIC-001', z.string());
    const secure = createSecureStorage();
    const vault = createIdentityVault({
      native: true,
      browser,
      secureStorage: secure.adapter,
    });

    await expect(vault.load()).resolves.toMatchObject({
      token: 'legacy-token',
      brainId: 'BR-SYNTHETIC-001',
    });
    expect(secure.adapter.set).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_AUTH_USER_KEY)).toBeNull();
    expect(window.localStorage.getItem(BRAIN_ID_KEY)).toBeNull();
  });

  it('prefers secure identity over stale browser identity', async () => {
    const secureRecord = {
      token: 'secure-token',
      user: { id: 'secure-user' },
      brainId: null,
    };
    const secure = createSecureStorage(JSON.stringify(secureRecord));
    browser.set(LEGACY_AUTH_TOKEN_KEY, 'legacy-token', z.string());
    browser.set(LEGACY_AUTH_USER_KEY, { id: 'legacy-user' }, z.unknown());
    const vault = createIdentityVault({
      native: true,
      browser,
      secureStorage: secure.adapter,
    });

    await expect(vault.load()).resolves.toEqual(secureRecord);
    expect(secure.adapter.set).not.toHaveBeenCalled();
  });

  it('keeps browser identity when a native write cannot be read back', async () => {
    browser.set(LEGACY_AUTH_TOKEN_KEY, 'legacy-token', z.string());
    browser.set(LEGACY_AUTH_USER_KEY, { id: 'legacy-user' }, z.unknown());
    const secure = createSecureStorage();
    secure.adapter.set.mockResolvedValueOnce({ value: true });
    const vault = createIdentityVault({
      native: true,
      browser,
      secureStorage: secure.adapter,
    });

    await expect(vault.load()).rejects.toThrow('missing');
    expect(browser.get(LEGACY_AUTH_TOKEN_KEY, z.string())).toEqual({
      ok: true,
      value: 'legacy-token',
    });
  });

  it('removes a corrupt secure record safely', async () => {
    const secure = createSecureStorage('{invalid-json');
    const vault = createIdentityVault({
      native: true,
      browser,
      secureStorage: secure.adapter,
    });

    await expect(vault.load()).resolves.toBeNull();
    expect(secure.adapter.remove).toHaveBeenCalledOnce();
  });

  it('propagates secure-storage failures during logout', async () => {
    const secure = createSecureStorage(JSON.stringify({
      token: 'synthetic-token',
      user: { id: 'user-1' },
    }));
    secure.adapter.remove.mockRejectedValueOnce(new Error('keystore unavailable'));
    const vault = createIdentityVault({
      native: true,
      browser,
      secureStorage: secure.adapter,
    });

    await expect(vault.clear()).rejects.toThrow('keystore unavailable');
  });
});
