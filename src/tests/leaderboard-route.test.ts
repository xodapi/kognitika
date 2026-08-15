/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resetGameRepositories,
  setLeaderboardQueryRepository,
} from '../server/infrastructure/container.ts';
import type { LeaderboardQueryRepository } from '../server/repositories/leaderboard-query-repository.ts';

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
  setLeaderboardQueryRepository({
    findGlobal: findGlobalMock,
    findWeekly: findWeeklyMock,
  });
});

afterEach(async () => {
  resetGameRepositories();
  await Promise.all(servers.splice(0).map((server) => (
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })
  )));
});

const findGlobalMock = vi.fn<LeaderboardQueryRepository['findGlobal']>();
const findWeeklyMock = vi.fn<LeaderboardQueryRepository['findWeekly']>();

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

async function getLeaderboard(baseUrl: string, period?: string) {
  const url = new URL(`${baseUrl}/api/leaderboard`);
  if (period) url.searchParams.set('period', period);
  const response = await fetch(url);

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

describe('weekly leaderboard XP contract', () => {
  it('rejects unsupported leaderboard periods instead of silently returning global data', async () => {
    const baseUrl = await createLeaderboardHarness();
    const response = await getLeaderboard(baseUrl, 'monthly');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(findGlobalMock).not.toHaveBeenCalled();
    expect(findWeeklyMock).not.toHaveBeenCalled();
  });

  it('uses recent XpEvent sums for weekly leaderboard ordering', async () => {
    findWeeklyMock.mockResolvedValue([
      {
        id: 'user_synthetic_top',
        pseudonym: 'Brain Top',
        experience: 120,
        level: 3,
        rating: 1110,
        _count: { sessions: 7 },
      },
      {
        id: 'user_synthetic_runner',
        pseudonym: 'Brain Runner',
        experience: 75,
        level: 2,
        rating: 1020,
        _count: { sessions: 4 },
      },
    ]);

    const baseUrl = await createLeaderboardHarness();
    const response = await getLeaderboard(baseUrl, 'weekly');

    expect(response.status).toBe(200);
    expect(findWeeklyMock).toHaveBeenCalledWith(expect.any(Date), 50);
    expect(response.body).toEqual([
      {
        id: 'user_synthetic_top',
        name: 'Brain Top',
        pseudonym: 'Brain Top',
        experience: 120,
        level: 3,
        rating: 1110,
        _count: { sessions: 7 },
      },
      {
        id: 'user_synthetic_runner',
        name: 'Brain Runner',
        pseudonym: 'Brain Runner',
        experience: 75,
        level: 2,
        rating: 1020,
        _count: { sessions: 4 },
      },
    ]);
  });

  it('uses the global repository projection when no period is provided', async () => {
    findGlobalMock.mockResolvedValue([
      {
        id: 'user_synthetic_global',
        pseudonym: 'Brain Global',
        experience: 950,
        level: 2,
        rating: 1010,
        _count: { sessions: 3 },
      },
    ]);

    const baseUrl = await createLeaderboardHarness();
    const response = await getLeaderboard(baseUrl);

    expect(response.status).toBe(200);
    expect(findGlobalMock).toHaveBeenCalledWith(50);
    expect(response.body).toEqual([
      expect.objectContaining({
        id: 'user_synthetic_global',
        name: 'Brain Global',
        experience: 950,
      }),
    ]);
  });
});
