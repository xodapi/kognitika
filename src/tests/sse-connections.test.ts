import { describe, expect, it } from 'vitest';
import { createSseConnectionManager, resolveSseConnectionLimits } from '../server/services/sse-connections';

describe('SSE connection limits', () => {
  it('enforces per-address and global limits', () => {
    const manager = createSseConnectionManager({ global: 2, perAddress: 1 });
    const releaseA = manager.acquire('198.51.100.1');

    expect(releaseA).toBeTypeOf('function');
    expect(manager.acquire('198.51.100.1')).toBeNull();
    const releaseB = manager.acquire('198.51.100.2');
    expect(releaseB).toBeTypeOf('function');
    expect(manager.acquire('198.51.100.3')).toBeNull();

    releaseA?.();
    expect(manager.acquire('198.51.100.3')).toBeTypeOf('function');
    releaseB?.();
  });

  it('releases each connection exactly once', () => {
    const manager = createSseConnectionManager({ global: 1, perAddress: 1 });
    const release = manager.acquire('198.51.100.1');

    release?.();
    release?.();

    expect(manager.counts().total).toBe(0);
    expect(manager.acquire('198.51.100.1')).toBeTypeOf('function');
  });

  it('uses bounded defaults for invalid environment values', () => {
    expect(resolveSseConnectionLimits({
      SSE_MAX_CONNECTIONS: '0',
      SSE_MAX_CONNECTIONS_PER_ADDRESS: 'invalid',
    })).toEqual({ global: 200, perAddress: 5 });
  });
});
