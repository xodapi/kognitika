type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMeta = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN = /(authorization|auth|bearer|brainid|cookie|email|jwt|localstorage|password|refresh|secret|storage|token)/i;
const REDACTION_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\bBR-[A-Z0-9-]{6,}\b/g,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  /(authorization|bearer|password|refresh|token)["':=\s]+[^"',\s]+/gi,
];

function isClientRuntime() {
  return typeof window !== 'undefined';
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function isTest() {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

function isDebugEnabled() {
  return process.env.VITE_DEBUG_LOGS === 'true' || process.env.DEBUG_LOGS === 'true';
}

export function redactText(value: unknown, maxLength = 500) {
  const text = String(value ?? '').slice(0, maxLength);
  return REDACTION_PATTERNS.reduce((current, pattern) => current.replace(pattern, '[redacted]'), text);
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 3) return '[depth-limit]';
  if (value == null) return value;
  if (value instanceof Error) {
    return {
      name: redactText(value.name, 120),
      message: redactText(value.message, 500),
    };
  }
  if (typeof value === 'string') return redactText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 10).map(item => sanitizeValue(item, depth + 1));
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : sanitizeValue(item, depth + 1);
    }
    return output;
  }
  return redactText(String(value));
}

export function sanitizeLogMeta(meta?: LogMeta) {
  if (!meta) return undefined;
  return sanitizeValue(meta) as LogMeta;
}

export function safeError(error: unknown) {
  return sanitizeValue(error);
}

export function createSafeLogger(scope: string) {
  const prefix = `[${redactText(scope, 80)}]`;

  function write(level: LogLevel, message: string, meta?: LogMeta) {
    if (isTest() && !isDebugEnabled()) {
      return;
    }

    if (isClientRuntime() && isProduction() && (level === 'debug' || level === 'info') && !isDebugEnabled()) {
      return;
    }

    const safeMessage = redactText(message, 500);
    const safeMeta = sanitizeLogMeta(meta);
    const args = safeMeta ? [`${prefix} ${safeMessage}`, safeMeta] : [`${prefix} ${safeMessage}`];

    if (level === 'error') {
      console.error(...args);
    } else if (level === 'warn') {
      console.warn(...args);
    } else if (level === 'info') {
      console.info(...args);
    } else {
      console.debug(...args);
    }
  }

  return {
    debug: (message: string, meta?: LogMeta) => write('debug', message, meta),
    info: (message: string, meta?: LogMeta) => write('info', message, meta),
    warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
    error: (message: string, meta?: LogMeta) => write('error', message, meta),
  };
}
