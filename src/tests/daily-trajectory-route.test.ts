/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = 'synthetic-daily-trajectory-secret';
const serviceMock = vi.hoisted(() => ({
  getOrCreateDailyPlan: vi.fn(),
  updateItemStatus: vi.fn(),
  computeProgress: vi.fn(),
}));

vi.mock('../server/services/daily-trajectory.ts', () => serviceMock);

let dailyTrajectoryRoutes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  dailyTrajectoryRoutes = (await import('../server/routes/daily-trajectory.ts')).default;
});

beforeEach(() => {
  vi.clearAllMocks();
  serviceMock.getOrCreateDailyPlan.mockResolvedValue([]);
  serviceMock.computeProgress.mockReturnValue({ completed: 0, total: 0 });
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  })));
});

async function createHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/daily-trajectory', dailyTrajectoryRoutes);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function authorization() {
  return { Authorization: `Bearer ${jwt.sign({ id: 'user-daily-validation' }, JWT_SECRET)}` };
}

describe('daily trajectory route validation', () => {
  it('rejects invalid dates before invoking plan services', async () => {
    const baseUrl = await createHarness();

    const getResponse = await fetch(`${baseUrl}/api/daily-trajectory?date=2026-02-30`, {
      headers: authorization(),
    });
    const generateResponse = await fetch(`${baseUrl}/api/daily-trajectory/generate`, {
      method: 'POST',
      headers: { ...authorization(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: 'not-a-date' }),
    });

    expect(getResponse.status).toBe(400);
    expect(generateResponse.status).toBe(400);
    expect(serviceMock.getOrCreateDailyPlan).not.toHaveBeenCalled();
  });

  it('rejects malformed item updates before invoking the update service', async () => {
    const baseUrl = await createHarness();

    const response = await fetch(`${baseUrl}/api/daily-trajectory/item`, {
      method: 'PATCH',
      headers: { ...authorization(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: '', status: 'unknown', date: '2026-02-30' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(serviceMock.updateItemStatus).not.toHaveBeenCalled();
  });

  it('passes validated dates and statuses to the update service', async () => {
    serviceMock.updateItemStatus.mockResolvedValue([]);
    const baseUrl = await createHarness();

    const response = await fetch(`${baseUrl}/api/daily-trajectory/item`, {
      method: 'PATCH',
      headers: { ...authorization(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: 'item-1', status: 'completed', date: '2026-07-31' }),
    });

    expect(response.status).toBe(200);
    expect(serviceMock.updateItemStatus).toHaveBeenCalledWith(
      'user-daily-validation',
      'item-1',
      'completed',
      new Date('2026-07-31T00:00:00.000Z'),
    );
  });
});
