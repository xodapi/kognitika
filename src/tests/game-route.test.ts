/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = 'synthetic-game-route-secret';

const prismaMock = vi.hoisted(() => ({
  gameSession: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
}));

const gameSaveMock = vi.hoisted(() => ({
  saveCompletedGame: vi.fn(),
}));

const eventBusMock = vi.hoisted(() => ({
  constructor: {
    EVENTS: {
      GAME_COMPLETED: 'game:completed',
    },
  },
  emit: vi.fn(),
}));

vi.mock('../lib/prisma.ts', () => ({
  default: prismaMock,
}));

vi.mock('../server/events/event-bus.ts', () => ({
  eventBus: eventBusMock,
}));

vi.mock('../server/services/game-save.ts', () => gameSaveMock);

let gameRoutes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  const module = await import('../server/routes/game.ts');
  gameRoutes = module.default;
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GAME_SAVE_LEGACY_COMPAT_ENABLED = 'false';
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => (
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })
  )));
});

async function createGameHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/game', gameRoutes);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);

  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

function userToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, JWT_SECRET);
}

async function postJson(baseUrl: string, path: string, token: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

describe('game route XP event contract', () => {
  it('records an XpEvent when a completed game awards XP', async () => {
    gameSaveMock.saveCompletedGame.mockResolvedValue({
      session: {
        id: 'session_synthetic_1',
        userId: 'user_synthetic_game',
        clientRunId: '11111111-1111-4111-8111-111111111111',
        gameType: 'SCHULTE',
        score: 21,
        timeMs: 5000,
        isCompleted: true,
        metadata: { size: 3 },
      },
      user: {
        id: 'user_synthetic_game',
        level: 1,
        experience: 121,
        streakDays: 1,
      },
      isReplay: false,
    });

    const baseUrl = await createGameHarness();
    const token = userToken({ id: 'user_synthetic_game' });
    const response = await postJson(baseUrl, '/api/game/save', token, {
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5000,
      metadata: { size: 3 },
    });

    expect(response.status).toBe(200);
    expect(gameSaveMock.saveCompletedGame).toHaveBeenCalledWith({
      userId: 'user_synthetic_game',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5000,
      metadata: { size: 3 },
    });
    expect(eventBusMock.emit).toHaveBeenCalledWith('game:completed', expect.objectContaining({
      userId: 'user_synthetic_game',
      sessionId: 'session_synthetic_1',
      score: 21,
      gameType: 'SCHULTE',
    }));
  });

  it('does not emit completion again for an idempotent replay', async () => {
    gameSaveMock.saveCompletedGame.mockResolvedValue({
      session: { id: 'session_synthetic_1', score: 21 },
      user: { experience: 121, streakDays: 1 },
      isReplay: true,
    });
    const baseUrl = await createGameHarness();
    const token = userToken({ id: 'user_synthetic_game' });
    const response = await postJson(baseUrl, '/api/game/save', token, {
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5000,
      metadata: { size: 3 },
    });

    expect(response.status).toBe(200);
    expect(response.body.session.id).toBe('session_synthetic_1');
    expect(eventBusMock.emit).not.toHaveBeenCalled();
  });

  it('rejects missing clientRunId when compatibility is disabled', async () => {
    const baseUrl = await createGameHarness();
    const token = userToken({ id: 'user_synthetic_game' });
    const response = await postJson(baseUrl, '/api/game/save', token, {
      gameType: 'SCHULTE',
      timeMs: 5000,
      metadata: { size: 3 },
    });

    expect(response.status).toBe(400);
    expect(gameSaveMock.saveCompletedGame).not.toHaveBeenCalled();
  });
});
