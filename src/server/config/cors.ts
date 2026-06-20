import type { CorsOptions } from 'cors';

type NodeEnv = 'development' | 'test' | 'production' | string;

export interface CorsRuntimeConfig {
  allowedOrigins: string[];
  allowWildcard: boolean;
  warning?: string;
}

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, '');
}

function parseOrigins(rawOrigin: string | undefined) {
  return [...new Set((rawOrigin || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean))];
}

function isLocalDevEnv(nodeEnv: NodeEnv) {
  return nodeEnv === 'development' || nodeEnv === 'test';
}

export function resolveCorsConfig(env: NodeJS.ProcessEnv = process.env): CorsRuntimeConfig {
  const nodeEnv = env.NODE_ENV || 'development';
  const origins = parseOrigins(env.CORS_ORIGIN);
  const explicitWildcard = env.CORS_ALLOW_DEV_WILDCARD === 'true';
  const hasWildcard = origins.includes('*');
  const allowWildcard = explicitWildcard && hasWildcard && isLocalDevEnv(nodeEnv);
  const allowedOrigins = origins.filter(origin => origin !== '*');

  if (hasWildcard && !allowWildcard) {
    return {
      allowedOrigins,
      allowWildcard: false,
      warning: nodeEnv === 'production'
        ? 'CORS_ORIGIN="*" is not allowed in production; cross-origin browser requests are denied until an allowlist is configured.'
        : 'CORS_ORIGIN="*" requires CORS_ALLOW_DEV_WILDCARD=true in development or test.',
    };
  }

  if (nodeEnv === 'production' && allowedOrigins.length === 0) {
    return {
      allowedOrigins,
      allowWildcard: false,
      warning: 'CORS_ORIGIN is empty in production; cross-origin browser requests are denied until an allowlist is configured.',
    };
  }

  return { allowedOrigins, allowWildcard };
}

export function isOriginAllowed(origin: string | undefined, config: CorsRuntimeConfig) {
  if (!origin) return true;
  if (config.allowWildcard) return true;
  return config.allowedOrigins.includes(normalizeOrigin(origin));
}

export function createCorsOriginDelegate(config: CorsRuntimeConfig) {
  return (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    callback(null, isOriginAllowed(origin, config));
  };
}

export function createExpressCorsOptions(config: CorsRuntimeConfig): CorsOptions {
  return {
    origin: createCorsOriginDelegate(config),
  };
}

export function createSocketCorsOptions(config: CorsRuntimeConfig) {
  return {
    origin: createCorsOriginDelegate(config),
    methods: ['GET', 'POST'],
  };
}
