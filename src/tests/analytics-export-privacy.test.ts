/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = 'synthetic-analytics-export-secret';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  gameSession: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../lib/prisma.ts', () => ({
  default: prismaMock,
}));

let analyticsRoutes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  const module = await import('../server/routes/analytics.ts');
  analyticsRoutes = module.default;
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => (
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })
  )));
});

async function createAnalyticsHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/analytics', analyticsRoutes);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);

  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

function userToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, JWT_SECRET);
}

describe('analytics export privacy contract', () => {
  it('exports cognitive data without raw Brain ID, email, token, or password fields', async () => {
    prismaMock.gameSession.findMany.mockResolvedValue([
      {
        id: 'session_synthetic_1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        gameType: 'SCHULTE',
        score: 100,
        timeMs: 25000,
        metadata: { synthetic: true, reactionTimeMs: 500 },
      },
    ]);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user_synthetic_export',
      name: 'Legacy Export Name',
      pseudonym: 'Brain Export',
      brainId: 'BR-SYNTHETIC-EXPORT-SECRET',
      email: 'export@example.test',
      password: 'synthetic-password-hash',
      token: 'synthetic-token',
      level: 3,
      rating: 1010,
      experience: 120,
      streakDays: 4,
    });

    const baseUrl = await createAnalyticsHarness();
    const token = userToken({ id: 'user_synthetic_export', identity: 'brain' });

    const response = await fetch(`${baseUrl}/api/analytics/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.subject).toMatchObject({
      brain_label: 'Brain BR-SYNTH',
      pseudonym: 'Brain Export',
      level: 3,
      rating: 1010,
      total_xp: 120,
      streak: 4,
    });
    expect(body.subject).not.toHaveProperty('id');
    expect(serialized).not.toContain('BR-SYNTHETIC-EXPORT-SECRET');
    expect(serialized).not.toContain('export@example.test');
    expect(serialized).not.toContain('synthetic-token');
    expect(serialized).not.toContain('synthetic-password-hash');
  });
});
