export function resolveMobileApiOrigin(
  rawOrigin: string | undefined,
  nodeEnv: string | undefined,
) {
  const fallback = nodeEnv === 'production' ? null : 'http://127.0.0.1:3006';
  const value = rawOrigin?.trim() || fallback;
  if (!value) throw new Error('EXPO_PUBLIC_API_URL is required in production');

  const origin = new URL(value);
  const isLoopback = origin.hostname === 'localhost' || origin.hostname === '127.0.0.1' || origin.hostname === '::1';
  if (origin.protocol !== 'https:' && !(nodeEnv !== 'production' && isLoopback && origin.protocol === 'http:')) {
    throw new Error('Mobile API origin must use HTTPS outside local development');
  }
  return origin.origin;
}
