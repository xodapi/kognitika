/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetGameRepositories } from '../server/infrastructure/container.ts';

const JWT_SECRET = 'synthetic-longitudinal-route-secret';
const prismaMock = vi.hoisted(() => ({
  gameSession: { findMany: vi.fn() },
  sessionAnalyticsSummary: { findMany: vi.fn() },
}));

vi.mock('../lib/prisma.ts', () => ({ default: prismaMock }));

let analyticsRoutes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  analyticsRoutes = (await import('../server/routes/analytics.ts')).default;
});

beforeEach(() => {
  resetGameRepositories();
  vi.clearAllMocks();
  const now = Date.now();
  prismaMock.gameSession.findMany.mockResolvedValue([
    { id: 'session-a', createdAt: new Date(now - 24 * 60 * 60 * 1000) },
    { id: 'session-b', createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000) },
    { id: 'session-c', createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000) },
  ]);
  prismaMock.sessionAnalyticsSummary.findMany.mockResolvedValue([
    { sourceSessionId: 'session-a', accuracy: 0.8, p50ReactionMs: 200 },
    { sourceSessionId: 'session-b', accuracy: 0.9, p50ReactionMs: 180 },
    { sourceSessionId: 'session-c', accuracy: 1, p50ReactionMs: 160 },
  ]);
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  })));
});

async function createHarness() {
  const app = express();
  app.use('/api/analytics', analyticsRoutes);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function authorization(userId = 'user-longitudinal') {
  return { Authorization: `Bearer ${jwt.sign({ id: userId }, JWT_SECRET)}` };
}

describe('longitudinal analytics route', () => {
  it('requires authentication, validates a required strict moduleId, and returns aggregate-only data', async () => {
    const baseUrl = await createHarness();

    expect((await fetch(`${baseUrl}/api/analytics/longitudinal?moduleId=nback`)).status).toBe(401);
    expect((await fetch(`${baseUrl}/api/analytics/longitudinal?moduleId=N_BACK`, {
      headers: authorization(),
    })).status).toBe(400);
    expect((await fetch(`${baseUrl}/api/analytics/longitudinal`, {
      headers: authorization(),
    })).status).toBe(400);
    expect(prismaMock.gameSession.findMany).not.toHaveBeenCalled();

    const response = await fetch(`${baseUrl}/api/analytics/longitudinal?moduleId=nback`, {
      headers: authorization(),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.windows[0]).toMatchObject({ status: 'ready', sessionCount: 3 });
    expect(JSON.stringify(body)).not.toMatch(/user-longitudinal|session-a|sourceSessionId|raw/i);
    expect(prismaMock.gameSession.findMany.mock.calls[0][0].where.userId).toBe('user-longitudinal');
    expect(prismaMock.sessionAnalyticsSummary.findMany.mock.calls[0][0].where.moduleId).toBe('nback');
  });
});
