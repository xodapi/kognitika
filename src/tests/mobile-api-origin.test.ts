import { describe, expect, it } from 'vitest';
import { resolveMobileApiOrigin } from '../../apps/mobile/src/lib/api-origin';

describe('mobile API origin security', () => {
  it('requires an explicit production origin', () => {
    expect(() => resolveMobileApiOrigin(undefined, 'production')).toThrow('required in production');
  });

  it('requires HTTPS in production', () => {
    expect(() => resolveMobileApiOrigin('http://kognitika.ru', 'production')).toThrow('must use HTTPS');
    expect(resolveMobileApiOrigin('https://kognitika.ru/path', 'production')).toBe('https://kognitika.ru');
  });

  it('allows HTTP only for loopback development origins', () => {
    expect(resolveMobileApiOrigin(undefined, 'development')).toBe('http://127.0.0.1:3006');
    expect(resolveMobileApiOrigin('http://localhost:3006/', 'development')).toBe('http://localhost:3006');
    expect(() => resolveMobileApiOrigin('http://192.168.1.10:3006', 'development')).toThrow('must use HTTPS');
  });
});
