import { describe, expect, it } from 'vitest';
import { config as getZodConfig, object, string } from 'zod';
import '../lib/zod-config';

describe('Zod CSP compatibility', () => {
  it('disables JIT compilation that requires eval', () => {
    expect(getZodConfig().jitless).toBe(true);
    expect(object({ name: string() }).parse({ name: 'Kognitika' })).toEqual({
      name: 'Kognitika',
    });
  });
});
