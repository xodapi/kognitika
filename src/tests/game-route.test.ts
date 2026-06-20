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
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  xpEvent: {
    create: vi.fn(),
  },
  $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations)),
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

let gameRoutes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  const module = await import('../server/routes/game.ts');
  gameRoutes = module.default;
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (operations: unknown[]) => Promise.all(operations));
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
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user_synthetic_game',
      level: 1,
      experience: 100,
      streakDays: 0,
      lastPlayedAt: null,
    });
    prismaMock.gameSession.create.mockResolvedValue({
      id: 'session_synthetic_1',
      userId: 'user_synthetic_game',
      gameType: 'SCHULTE',
      score: 21,
      timeMs: 5000,
      isCompleted: true,
      metadata: { size: 3 },
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'user_synthetic_game',
      level: 1,
      experience: 121,
      streakDays: 1,
    });
    prismaMock.xpEvent.create.mockResolvedValue({
      id: 'xp_synthetic_1',
      userId: 'user_synthetic_game',
      amount: 21,
      reason: 'game:SCHULTE',
    });

    const baseUrl = await createGameHarness();
    const token = userToken({ id: 'user_synthetic_game' });
    const response = await postJson(baseUrl, '/api/game/save', token, {
      gameType: 'SCHULTE',
      timeMs: 5000,
      metadata: { size: 3 },
    });

    expect(response.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.xpEvent.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_synthetic_game',
        amount: 21,
        reason: 'game:SCHULTE',
      },
    });
    expect(eventBusMock.emit).toHaveBeenCalledWith('game:completed', expect.objectContaining({
      userId: 'user_synthetic_game',
      sessionId: 'session_synthetic_1',
      score: 21,
      gameType: 'SCHULTE',
    }));
  });
});
