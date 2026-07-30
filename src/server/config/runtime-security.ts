const INSECURE_SECRET_VALUES = new Set([
  'replace-with-strong-random-secret',
  'ci-only-replace-with-strong-secret',
  'e2e-only-replace-with-strong-secret',
]);

export function validateJwtSecret(
  secret: string | undefined,
  nodeEnv = process.env.NODE_ENV,
): string {
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment');
  }

  if (nodeEnv === 'production') {
    if (INSECURE_SECRET_VALUES.has(secret) || secret.length < 32) {
      throw new Error('JWT_SECRET must be a strong non-placeholder secret in production');
    }
  }

  return secret;
}
