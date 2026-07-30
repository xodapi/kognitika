import { describe, expect, it } from 'vitest';
import { validateJwtSecret } from '../server/config/runtime-security';

describe('runtime security configuration', () => {
  it('requires JWT_SECRET in every environment', () => {
    expect(() => validateJwtSecret(undefined, 'test')).toThrow('JWT_SECRET is not defined');
  });

  it('rejects known placeholders in production', () => {
    expect(() => validateJwtSecret('replace-with-strong-random-secret', 'production')).toThrow(
      'strong non-placeholder secret',
    );
  });

  it('rejects short production secrets', () => {
    expect(() => validateJwtSecret('short-secret', 'production')).toThrow(
      'strong non-placeholder secret',
    );
  });

  it('accepts a strong production secret', () => {
    const secret = 'synthetic-production-secret-with-32-plus-characters';
    expect(validateJwtSecret(secret, 'production')).toBe(secret);
  });
});
