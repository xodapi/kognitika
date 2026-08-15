import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('server analytics outbox shutdown contract', () => {
  it('shares an idempotent shutdown path between close and termination signals', () => {
    const source = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');

    expect(source).toContain('let shutdownPromise: Promise<void> | null = null;');
    expect(source).toContain("httpServer.once('close', () => {");
    expect(source).toContain('resolveHttpServerDrain();');
    expect(source).toContain("process.once('SIGTERM', () => {");
    expect(source).toContain("process.once('SIGINT', () => {");
    expect(source).toContain('if (httpServer.listening) httpServer.close();');
    expect(source).toContain('const workerStop = analyticsOutboxWorker?.stop();');
    expect(source).toContain('const httpServerDrain = new Promise<void>');
    expect(source).toContain('const cleanup = httpServerDrain.then(() => Promise.allSettled([');
    expect(source).toContain('prisma.$disconnect()');
    expect(source).toContain('const SERVER_SHUTDOWN_GRACE_MS = 10_000;');
    expect(source).toContain('Promise.allSettled([');
    expect(source).toContain('graceTimer.unref?.();');
    expect(source).toContain("'Server shutdown grace window elapsed'");
  });
});
