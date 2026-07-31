import { describe, expect, it } from 'vitest';
import { resolveListenHost, resolveTrustProxy } from '../server/config/proxy';

describe('proxy and listen configuration', () => {
  it('trusts only loopback proxies by default in production', () => {
    expect(resolveTrustProxy({ NODE_ENV: 'production' })).toBe('loopback');
  });

  it('does not trust forwarded addresses by default outside production', () => {
    expect(resolveTrustProxy({ NODE_ENV: 'test' })).toBe(false);
  });

  it('accepts only explicit bounded trust modes', () => {
    expect(resolveTrustProxy({ TRUST_PROXY: 'false' })).toBe(false);
    expect(resolveTrustProxy({ TRUST_PROXY: 'loopback' })).toBe('loopback');
    expect(resolveTrustProxy({ TRUST_PROXY: '1' })).toBe(1);
    expect(() => resolveTrustProxy({ TRUST_PROXY: 'true' })).toThrow('TRUST_PROXY');
    expect(() => resolveTrustProxy({ TRUST_PROXY: '0.0.0.0/0' })).toThrow('TRUST_PROXY');
  });

  it('binds direct production processes to loopback by default', () => {
    expect(resolveListenHost({ NODE_ENV: 'production' })).toBe('127.0.0.1');
    expect(resolveListenHost({ NODE_ENV: 'development' })).toBe('0.0.0.0');
    expect(resolveListenHost({ NODE_ENV: 'production', LISTEN_HOST: '0.0.0.0' })).toBe('0.0.0.0');
  });
});
