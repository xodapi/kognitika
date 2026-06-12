import { STORAGE_SCHEMA_VERSION } from './storage-keys';

type ClientErrorInput = {
  name?: string;
  message?: string;
  stack?: string;
};

type ClientErrorContext = {
  source?: string;
  route?: string;
};

const REDACTION_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\bBR-[A-Z0-9-]{6,}\b/gi,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  /(token|refresh|authorization|password)["':=\s]+[^"',\s]+/gi,
];

function sanitize(value: unknown, fallback = 'unknown'): string {
  const text = String(value || fallback).slice(0, 1200);
  return REDACTION_PATTERNS.reduce((current, pattern) => current.replace(pattern, '[redacted]'), text);
}

function normalizeError(error: unknown): ClientErrorInput {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: 'NonError',
    message: typeof error === 'string' ? error : 'Unhandled non-error value',
  };
}

export function reportClientError(error: unknown, context: ClientErrorContext = {}) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  const normalized = normalizeError(error);
  const payload = {
    name: sanitize(normalized.name, 'Error'),
    message: sanitize(normalized.message, 'Unknown client error'),
    stack: normalized.stack ? sanitize(normalized.stack) : undefined,
    route: sanitize(context.route || window.location.pathname),
    source: sanitize(context.source || 'client'),
    buildId: sanitize(import.meta.env.VITE_BUILD_ID || import.meta.env.VITE_GIT_COMMIT || 'dev'),
    storageSchemaVersion: STORAGE_SCHEMA_VERSION,
    swController: Boolean(navigator.serviceWorker?.controller),
  };

  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/client-error', blob)) return;
    }

    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never make recovery worse.
  }
}

export function setupGlobalErrorReporting() {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    reportClientError(event.error || event.message, { source: 'window.onerror' });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event.reason, { source: 'unhandledrejection' });
  });
}
