import { describe, expect, it } from 'vitest';
import {
  createCorsOriginDelegate,
  isOriginAllowed,
  resolveCorsConfig,
} from '../server/config/cors.ts';

function decide(origin: string | undefined, env: NodeJS.ProcessEnv) {
  const config = resolveCorsConfig(env);
  let allowed: boolean | undefined;
  createCorsOriginDelegate(config)(origin, (_error, result) => {
    allowed = result;
  });
  return { config, allowed };
}

describe('CORS runtime config', () => {
  it('allows an origin from the CORS_ORIGIN allowlist', () => {
    const config = resolveCorsConfig({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://kognitika.syntog.ru, https://admin.kognitika.syntog.ru',
    });

    expect(isOriginAllowed('https://kognitika.syntog.ru', config)).toBe(true);
    expect(isOriginAllowed('https://admin.kognitika.syntog.ru', config)).toBe(true);
    expect(isOriginAllowed('https://example.test', config)).toBe(false);
    expect(config.warning).toBeUndefined();
  });

  it('denies wildcard CORS in production and logs a safe warning', () => {
    const { config, allowed } = decide('https://example.test', {
      NODE_ENV: 'production',
      CORS_ORIGIN: '*',
      CORS_ALLOW_DEV_WILDCARD: 'true',
    });

    expect(config.allowWildcard).toBe(false);
    expect(config.warning).toMatch(/not allowed in production/i);
    expect(allowed).toBe(false);
  });

  it('allows wildcard CORS only through explicit development/test opt-in', () => {
    const { config, allowed } = decide('https://example.test', {
      NODE_ENV: 'test',
      CORS_ORIGIN: '*',
      CORS_ALLOW_DEV_WILDCARD: 'true',
    });

    expect(config.allowWildcard).toBe(true);
    expect(allowed).toBe(true);
  });

  it('fails closed for missing production allowlist but allows same-origin server requests', () => {
    const { config, allowed } = decide('https://example.test', {
      NODE_ENV: 'production',
      CORS_ORIGIN: '',
    });

    expect(config.warning).toMatch(/empty in production/i);
    expect(allowed).toBe(false);
    expect(isOriginAllowed(undefined, config)).toBe(true);
  });
});
