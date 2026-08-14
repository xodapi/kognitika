import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('server analytics outbox shutdown contract', () => {
  it('shares an idempotent shutdown path between close and termination signals', () => {
    const source = readFileSync(resolve(process.cwd(), 'server.ts'), 'utf8');

    expect(source).toContain('let shutdownPromise: Promise<void> | null = null;');
    expect(source).toContain("httpServer.once('close', () => void shutdown());");
    expect(source).toContain("process.once('SIGTERM', () => {");
    expect(source).toContain("process.once('SIGINT', () => {");
    expect(source).toContain('if (httpServer.listening) httpServer.close();');
    expect(source).toContain('analyticsOutboxWorker?.stop()');
    expect(source).toContain('prisma.$disconnect()');
  });
});
