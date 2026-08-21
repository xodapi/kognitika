/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  resetGameRepositories,
  setDashboardRepository,
} from '../server/infrastructure/container.ts';
import type { DashboardRepository } from '../server/repositories/dashboard-repository.ts';

const JWT_SECRET = 'synthetic-dashboard-route-secret';
let dashboardRoutes: Router;
const servers: HttpServer[] = [];

const userMock = async (_userId: string): ReturnType<DashboardRepository['findUser']> => null;
const sessionsMock = async (
  _userId: string,
  _limit: number,
): ReturnType<DashboardRepository['findRecentCompletedSessions']> => [];
let findUser = userMock;
let findRecentCompletedSessions = sessionsMock;

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  const module = await import('../server/routes/dashboard.ts');
  dashboardRoutes = module.default;
});

beforeEach(() => {
  findUser = userMock;
  findRecentCompletedSessions = sessionsMock;
  setDashboardRepository({
    findUser: (userId) => findUser(userId),
    findRecentCompletedSessions: (userId, limit) => findRecentCompletedSessions(userId, limit),
  });
});

afterEach(async () => {
  resetGameRepositories();
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

async function createHarness() {
  const app = express();
  app.use('/api/dashboard', dashboardRoutes);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function getStatus(baseUrl: string, payload: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/api/dashboard/status`, {
    headers: { Authorization: `Bearer ${jwt.sign(payload, JWT_SECRET)}` },
  });
  return { status: response.status, body: await response.json() };
}

describe('dashboard route persistence contract', () => {
  it('returns 404 when the authenticated user is absent', async () => {
    const response = await getStatus(await createHarness(), { id: 'user_missing' });

    expect(response).toEqual({ status: 404, body: { error: 'User not found' } });
  });

  it('calculates dashboard status from repository projections only', async () => {
    findUser = async () => ({
      id: 'user_dashboard',
      level: 2,
      experience: 750,
      role: 'USER',
      streakDays: 3,
      lastPlayedAt: new Date(),
    });
    findRecentCompletedSessions = async (userId, limit) => {
      expect(userId).toBe('user_dashboard');
      expect(limit).toBe(50);
      return [{ id: 'session_1', gameType: 'N_BACK', score: 100, createdAt: new Date() }];
    };

    const response = await getStatus(await createHarness(), { id: 'user_dashboard' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      levelProgress: 50,
      role: 'USER',
      streak: { days: 3, multiplier: 1.5, isBroken: false },
    });
    expect(response.body.dailyTasks[0]).toMatchObject({ gameType: 'SCHULTE' });
  });
});
