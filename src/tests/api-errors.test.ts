/**
 * @vitest-environment node
 */
import express from 'express';
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { afterEach, describe, expect, it } from 'vitest';
import { apiErrorHandler, apiNotFound } from '../server/middleware/api-errors.ts';

const servers: Server[] = [];

async function createHarness() {
  const app = express();
  app.use(express.json());
  app.post('/api/echo', (req, res) => res.json(req.body));
  app.use('/api', apiNotFound);
  app.use(apiErrorHandler);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => (
    new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  )));
});

describe('API error envelope middleware', () => {
  it('returns a JSON 404 instead of SPA fallback content for an unknown API route', async () => {
    const baseUrl = await createHarness();
    const response = await fetch(`${baseUrl}/api/does-not-exist`);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({
      error: 'API route not found',
      code: 'NOT_FOUND',
      path: '/api/does-not-exist',
    });
  });

  it('returns a stable JSON validation envelope for malformed JSON', async () => {
    const baseUrl = await createHarness();
    const response = await fetch(`${baseUrl}/api/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toEqual({
      error: 'Malformed JSON request body',
      code: 'VALIDATION_ERROR',
      issues: [],
    });
  });
});
