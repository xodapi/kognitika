type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Mobile logs must not contain server responses, storage values, identifiers,
 * or arbitrary caught-error text. Keep error context intentionally generic.
 */
export function safeError(_error: unknown): { type: 'sanitized-error' } {
  return { type: 'sanitized-error' };
}

function isDevelopment(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!isDevelopment() && (level === 'debug' || level === 'info')) return;

  const args = meta ? [message, meta] : [message];
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

export function createSafeLogger(scope: string) {
  const prefix = `[${scope}]`;

  return {
    debug: (message: string) => write('debug', `${prefix} ${message}`),
    info: (message: string) => write('info', `${prefix} ${message}`),
    warn: (message: string, meta?: Record<string, unknown>) => write('warn', `${prefix} ${message}`, meta),
    error: (message: string, meta?: Record<string, unknown>) => write('error', `${prefix} ${message}`, meta),
  };
}
