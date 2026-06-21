/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  clearPracticeFlowEventsForTests,
  getPracticeFlowEvents,
} from '../server/services/practice-flow-store';

let practiceFlowRoutes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  const module = await import('../server/routes/practice-flow.ts');
  practiceFlowRoutes = module.default;
});

beforeEach(() => {
  clearPracticeFlowEventsForTests();
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => (
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })
  )));
});

async function createHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/analytics/practice-flow', practiceFlowRoutes);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);

  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

async function postJson(baseUrl: string, body: unknown) {
  const response = await fetch(`${baseUrl}/api/analytics/practice-flow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

const validEvent = {
  event: 'PracticeStarted',
  category: 'cognitive',
  moduleId: 'typing',
  route: '/typing',
  buildId: 'test-build',
  storageSchemaVersion: '1',
  anonymousSessionId: 'anon-synthetic-route',
  timestamp: '2026-01-01T00:00:00.000Z',
  checkpoint: 'route_loaded',
};

describe('practice flow route', () => {
  it('stores privacy-safe practice flow events', async () => {
    const baseUrl = await createHarness();
    const response = await postJson(baseUrl, validEvent);

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ success: true });
    expect(getPracticeFlowEvents()).toHaveLength(1);
  });

  it('rejects PII-like event fields before storage', async () => {
    const baseUrl = await createHarness();
    const response = await postJson(baseUrl, {
      ...validEvent,
      email: 'synthetic@example.test',
      token: 'synthetic-token',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid practice flow event' });
    expect(getPracticeFlowEvents()).toHaveLength(0);
  });
});
