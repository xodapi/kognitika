/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = 'synthetic-leaderboard-route-secret';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  xpEvent: {
    groupBy: vi.fn(),
  },
}));

vi.mock('../lib/prisma.ts', () => ({
  default: prismaMock,
}));

let leaderboardRoutes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  const module = await import('../server/routes/leaderboard.ts');
  leaderboardRoutes = module.default;
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

async function createLeaderboardHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/leaderboard', leaderboardRoutes);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);

  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

function token(payload: Record<string, unknown>) {
  return jwt.sign(payload, JWT_SECRET);
}

async function postSync(baseUrl: string, authToken?: string) {
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const response = await fetch(`${baseUrl}/api/leaderboard/sync`, {
    method: 'POST',
    headers,
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

describe('leaderboard sync authorization', () => {
  it('rejects unauthenticated sync requests', async () => {
    const baseUrl = await createLeaderboardHarness();
    const response = await postSync(baseUrl);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects non-admin users', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ role: 'USER' });
    const baseUrl = await createLeaderboardHarness();
    const response = await postSync(baseUrl, token({ id: 'user_synthetic_regular', role: 'ADMIN' }));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Access denied' });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user_synthetic_regular' },
      select: { role: true },
    });
  });

  it('allows admin users to start sync', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    const baseUrl = await createLeaderboardHarness();
    const response = await postSync(baseUrl, token({ id: 'user_synthetic_admin' }));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Sync started' });
  });
});
