import { describe, expect, it, vi } from 'vitest';
import {
  PRODUCTION_API_ORIGIN,
  apiUrl,
  createApiAwareFetch,
  resolveApiOrigin,
  socketUrl,
} from '../lib/runtime-platform';
import { resolveNativeRoute } from '../lib/native-navigation';

describe('runtime platform URLs', () => {
  it('keeps browser API requests relative by default', () => {
    expect(resolveApiOrigin({ native: false, configuredOrigin: '' })).toBe('');
    expect(apiUrl('/api/me', '')).toBe('/api/me');
  });

  it('uses the production API origin in a native runtime', () => {
    const origin = resolveApiOrigin({ native: true, configuredOrigin: '' });

    expect(origin).toBe(PRODUCTION_API_ORIGIN);
    expect(apiUrl('/api/me', origin)).toBe(`${PRODUCTION_API_ORIGIN}/api/me`);
    expect(socketUrl(origin)).toBe(PRODUCTION_API_ORIGIN);
  });

  it('normalizes an explicit API origin', () => {
    expect(resolveApiOrigin({
      native: false,
      configuredOrigin: 'https://api.example.test///',
    })).toBe('https://api.example.test');
  });

  it('rewrites only relative API fetches', async () => {
    const response = new Response(null, { status: 204 });
    const fetchImpl = vi.fn().mockResolvedValue(response);
    const nativeFetch = createApiAwareFetch(fetchImpl, PRODUCTION_API_ORIGIN);

    await nativeFetch('/api/me');
    await nativeFetch('https://cdn.example.test/data.json');

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      `${PRODUCTION_API_ORIGIN}/api/me`,
      undefined,
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'https://cdn.example.test/data.json',
      undefined,
    );
  });

  it('rejects non-API relative paths passed to apiUrl', () => {
    expect(() => apiUrl('/assets/icon.svg', PRODUCTION_API_ORIGIN)).toThrow(
      '/api/',
    );
  });

  it('accepts only declared mobile deep-link routes', () => {
    expect(resolveNativeRoute('kognitika://mental-math?source=push')).toBe(
      '/mental-math?source=push',
    );
    expect(resolveNativeRoute('https://kognitika.syntog.ru/schulte-90')).toBe(
      '/schulte-90',
    );
    expect(resolveNativeRoute('https://example.test/mental-math')).toBeNull();
  });
});
