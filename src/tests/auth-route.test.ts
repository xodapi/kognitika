/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetGameRepositories, setAuthRepository } from '../server/infrastructure/container.ts';
import type { AuthRepository } from '../server/repositories/auth-repository.ts';

const JWT_SECRET = 'synthetic-auth-route-secret';
const createBrainUser = vi.fn<AuthRepository['createBrainUser']>();
const findByBrainId = vi.fn<AuthRepository['findByBrainId']>();
let routes: Router;
const servers: HttpServer[] = [];
const user = {
  id: 'user_synthetic_auth',
  name: 'Brain Synthetic',
  brainId: 'BR-SYNTHETIC-AUTH',
  pseudonym: 'Brain Synthetic',
  role: 'USER',
  level: 1,
  experience: 100,
  rating: 1000,
  streakDays: 0,
};

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  routes = (await import('../server/routes/auth.ts')).default;
});

beforeEach(() => {
  vi.clearAllMocks();
  setAuthRepository({ createBrainUser, findByBrainId });
});

afterEach(async () => {
  resetGameRepositories();
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

async function createHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', routes);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function post(baseUrl: string, path: string, body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

describe('Brain ID auth persistence contract', () => {
  it('creates a Brain ID user through the repository before responding', async () => {
    createBrainUser.mockResolvedValue(user);

    const response = await post(await createHarness(), '/api/auth/brain');

    expect(response.status).toBe(200);
    expect(createBrainUser).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f-]{36}$/i),
      expect.any(String),
    );
    expect(response.body).toMatchObject({
      brainId: 'BR-SYNTHETIC-AUTH',
      pseudonym: 'Brain Synthetic',
      user: { id: 'user_synthetic_auth', experience: 100 },
      token: expect.any(String),
    });
  });

  it('returns 404 when a Brain ID cannot be restored', async () => {
    findByBrainId.mockResolvedValue(null);

    const response = await post(await createHarness(), '/api/auth/restore', { brainId: 'BR-MISSING' });

    expect(response).toEqual({
      status: 404,
      body: { error: 'Session not found. Please check your Brain ID.' },
    });
  });

  it('restores an existing Brain ID through the repository', async () => {
    findByBrainId.mockResolvedValue(user);

    const response = await post(await createHarness(), '/api/auth/restore', { brainId: 'BR-SYNTHETIC-AUTH' });

    expect(response.status).toBe(200);
    expect(findByBrainId).toHaveBeenCalledWith('BR-SYNTHETIC-AUTH');
    expect(response.body).toMatchObject({ brainId: 'BR-SYNTHETIC-AUTH', token: expect.any(String) });
  });
});
