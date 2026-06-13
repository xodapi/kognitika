import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('EventBus import boundaries', () => {
  it('keeps the core EventBus dependency-free from client and server side effects', () => {
    const coreBus = read('src/core/events/event-bus.ts');
    const coreSchema = read('src/core/events/event-schema.ts');
    const source = `${coreBus}\n${coreSchema}`;

    expect(source).not.toMatch(/prisma|nodemailer|window|Worker|event-recorder|cognitive-metrics|anti-fraud|safe-logger/);
  });

  it('keeps server events free from client analytics middleware', () => {
    const serverBus = read('src/server/events/event-bus.ts');

    expect(serverBus).not.toMatch(/event-recorder|cognitive-metrics|anti-fraud|client\/analytics|Worker|window/);
  });

  it('keeps client analytics free from server-only dependencies', () => {
    const clientBus = read('src/client/analytics/event-bus.ts');

    expect(clientBus).not.toMatch(/prisma|nodemailer|server\/routes|server\/middleware|server\/events/);
  });

  it('keeps the legacy lib export as a thin compatibility layer', () => {
    const legacyExport = read('src/lib/event-bus.ts').trim();

    expect(legacyExport).toBe("export { eventBus, EventBus } from '../client/analytics/event-bus';");
  });
});
