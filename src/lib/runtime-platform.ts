import { Capacitor } from '@capacitor/core';

export const PRODUCTION_API_ORIGIN = 'https://kognitika.ru';
const NATIVE_FETCH_BRIDGE_INSTALLED = '__kognitikaNativeFetchBridgeInstalled';

function normalizeOrigin(value: string | undefined) {
  return value?.trim().replace(/\/+$/, '') || '';
}

export function isNativeRuntime() {
  return Capacitor.isNativePlatform();
}

export function resolveApiOrigin(input: {
  configuredOrigin?: string;
  native?: boolean;
} = {}) {
  const configuredOrigin = normalizeOrigin(
    input.configuredOrigin ?? import.meta.env.VITE_API_ORIGIN,
  );
  if (configuredOrigin) return configuredOrigin;

  const native = input.native ?? isNativeRuntime();
  return native ? PRODUCTION_API_ORIGIN : '';
}

export function apiUrl(path: string, origin = resolveApiOrigin()) {
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith('/api/')) {
    throw new Error('API paths must start with /api/');
  }
  return origin ? `${origin}${path}` : path;
}

export function createApiAwareFetch(
  fetchImpl: typeof fetch,
  origin = resolveApiOrigin(),
): typeof fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const resolvedInput = typeof input === 'string' && input.startsWith('/api/')
      ? apiUrl(input, origin)
      : input;
    return fetchImpl(resolvedInput, init);
  }) as typeof fetch;
}

export function installNativeNetworkBridge() {
  if (!isNativeRuntime()) return;
  const runtime = globalThis as typeof globalThis & Record<string, boolean | undefined>;
  if (runtime[NATIVE_FETCH_BRIDGE_INSTALLED]) return;
  globalThis.fetch = createApiAwareFetch(globalThis.fetch.bind(globalThis));
  runtime[NATIVE_FETCH_BRIDGE_INSTALLED] = true;
}

export function sendApiBeacon(path: string, data: BodyInit | null) {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    return false;
  }
  return navigator.sendBeacon(apiUrl(path), data);
}

export function socketUrl(origin = resolveApiOrigin()) {
  if (origin) return origin;
  return typeof window === 'undefined' ? PRODUCTION_API_ORIGIN : window.location.origin;
}
