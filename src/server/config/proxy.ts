export function resolveTrustProxy(env: NodeJS.ProcessEnv = process.env) {
  const raw = env.TRUST_PROXY?.trim();

  if (!raw) return env.NODE_ENV === 'production' ? 'loopback' : false;
  if (raw === 'false') return false;
  if (raw === 'loopback') return 'loopback';
  if (/^[1-9]\d*$/.test(raw)) return Number(raw);

  throw new Error('TRUST_PROXY must be false, loopback, or a positive hop count');
}

export function resolveListenHost(env: NodeJS.ProcessEnv = process.env) {
  const host = env.LISTEN_HOST?.trim();
  if (host) return host;
  return env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';
}
