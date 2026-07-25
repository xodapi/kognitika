import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { z } from 'zod';
import {
  AUTH_TOKEN_KEY,
  BRAIN_ID_KEY,
  LEGACY_AUTH_TOKEN_KEY,
  LEGACY_AUTH_USER_KEY,
} from './storage-keys';
import { storageGateway, type BrowserStorageGateway } from './storage-gateway';
import { isNativeRuntime } from './runtime-platform';

const NATIVE_IDENTITY_KEY = 'kognitika.identity.v1';

const identityRecordSchema = z.object({
  token: z.string().min(1),
  user: z.unknown(),
  brainId: z.string().min(1).nullable().optional(),
});

export type IdentityRecord = z.infer<typeof identityRecordSchema>;

interface SecureStorageAdapter {
  get(options: { key: string }): Promise<{ value: string }>;
  set(options: { key: string; value: string }): Promise<{ value: boolean }>;
  remove(options: { key: string }): Promise<{ value: boolean }>;
  keys(): Promise<{ value: string[] }>;
}

export interface IdentityVault {
  load(): Promise<IdentityRecord | null>;
  save(record: IdentityRecord): Promise<void>;
  clear(): Promise<void>;
}

const tokenSchema = z.string().min(1);

function parseIdentityRecord(value: string) {
  try {
    const parsed = identityRecordSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function readBrowserIdentity(browser: BrowserStorageGateway): IdentityRecord | null {
  const canonicalToken = browser.get(AUTH_TOKEN_KEY, tokenSchema);
  const legacyToken = browser.get(LEGACY_AUTH_TOKEN_KEY, tokenSchema);
  const legacyUser = browser.get(LEGACY_AUTH_USER_KEY, z.unknown());
  const brainId = browser.get(BRAIN_ID_KEY, tokenSchema);
  const token = canonicalToken.ok && canonicalToken.value
    ? canonicalToken.value
    : legacyToken.ok
      ? legacyToken.value
      : null;

  if (!token || !legacyUser.ok || !legacyUser.value) return null;
  return {
    token,
    user: legacyUser.value,
    brainId: brainId.ok ? brainId.value : null,
  };
}

function writeBrowserIdentity(browser: BrowserStorageGateway, record: IdentityRecord) {
  browser.set(AUTH_TOKEN_KEY, record.token, tokenSchema);
  browser.set(LEGACY_AUTH_TOKEN_KEY, record.token, tokenSchema);
  browser.set(LEGACY_AUTH_USER_KEY, record.user, z.unknown());
  if (record.brainId) {
    browser.set(BRAIN_ID_KEY, record.brainId, tokenSchema);
  } else {
    browser.remove(BRAIN_ID_KEY);
  }
}

function clearBrowserIdentity(browser: BrowserStorageGateway) {
  browser.remove(AUTH_TOKEN_KEY);
  browser.remove(LEGACY_AUTH_TOKEN_KEY);
  browser.remove(LEGACY_AUTH_USER_KEY);
  browser.remove(BRAIN_ID_KEY);
}

async function persistNativeIdentity(
  secureStorage: SecureStorageAdapter,
  record: IdentityRecord,
) {
  const serialized = JSON.stringify(record);
  await secureStorage.set({
    key: NATIVE_IDENTITY_KEY,
    value: serialized,
  });
  const readback = await secureStorage.get({ key: NATIVE_IDENTITY_KEY });
  if (readback.value !== serialized) {
    throw new Error('Secure identity storage could not be verified');
  }
}

export function createIdentityVault(options: {
  native?: boolean;
  browser?: BrowserStorageGateway;
  secureStorage?: SecureStorageAdapter;
} = {}): IdentityVault {
  const native = options.native ?? isNativeRuntime();
  const browser = options.browser ?? storageGateway;
  const secureStorage = options.secureStorage ?? SecureStoragePlugin;

  if (!native) {
    return {
      async load() {
        return readBrowserIdentity(browser);
      },
      async save(input) {
        const record = identityRecordSchema.parse(input);
        writeBrowserIdentity(browser, record);
      },
      async clear() {
        clearBrowserIdentity(browser);
      },
    };
  }

  return {
    async load() {
      const keys = await secureStorage.keys();
      if (keys.value.includes(NATIVE_IDENTITY_KEY)) {
        const stored = await secureStorage.get({ key: NATIVE_IDENTITY_KEY });
        const parsed = parseIdentityRecord(stored.value);
        if (parsed) return parsed;
        await secureStorage.remove({ key: NATIVE_IDENTITY_KEY });
      }

      const legacyRecord = readBrowserIdentity(browser);
      if (!legacyRecord) return null;

      await persistNativeIdentity(secureStorage, legacyRecord);
      clearBrowserIdentity(browser);
      return legacyRecord;
    },
    async save(input) {
      const record = identityRecordSchema.parse(input);
      await persistNativeIdentity(secureStorage, record);
      clearBrowserIdentity(browser);
    },
    async clear() {
      const keys = await secureStorage.keys();
      if (keys.value.includes(NATIVE_IDENTITY_KEY)) {
        await secureStorage.remove({ key: NATIVE_IDENTITY_KEY });
      }
      clearBrowserIdentity(browser);
    },
  };
}

export const identityVault = createIdentityVault();
