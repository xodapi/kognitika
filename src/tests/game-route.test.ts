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

const gameAttemptMock = vi.hoisted(() => {
  class GameAttemptError extends Error {
    constructor(message: string, public status: 400 | 403 | 409, public code: string) {
      super(message);
    }
  }
  return { GameAttemptError, startGameAttempt: vi.fn() };
});

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

vi.mock('../server/services/game-attempt.ts', () => gameAttemptMock);
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
  it('starts an authenticated server challenge attempt', async () => {
    const issuedAt = new Date('2026-07-31T12:00:00.000Z');
    gameAttemptMock.startGameAttempt.mockResolvedValue({
      attemptId: 'attempt-a', challenge: 'synthetic-challenge', issuedAt,
      notBefore: issuedAt, expiresAt: new Date('2026-07-31T12:15:00.000Z'),
    });
    const baseUrl = await createGameHarness();
    const token = userToken({ id: 'user_synthetic_game' });
    const response = await postJson(baseUrl, '/api/game/attempts', token, {
      gameType: 'SCHULTE', clientRunId: '11111111-1111-4111-8111-111111111111',
    });

    expect(response.status).toBe(201);
    expect(response.body.attemptId).toBe('attempt-a');
    expect(gameAttemptMock.startGameAttempt).toHaveBeenCalledWith({
      userId: 'user_synthetic_game', gameType: 'SCHULTE',
      clientRunId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('rejects invalid game types when starting an attempt', async () => {
    const baseUrl = await createGameHarness();
    const token = userToken({ id: 'user_synthetic_game' });
    const response = await postJson(baseUrl, '/api/game/attempts', token, {
      gameType: 'NOT_A_GAME', clientRunId: '11111111-1111-4111-8111-111111111111',
    });
    expect(response.status).toBe(400);
    expect(gameAttemptMock.startGameAttempt).not.toHaveBeenCalled();
  });

  it('records an XpEvent when a completed legacy-compatible game awards XP', async () => {
    process.env.GAME_SAVE_LEGACY_COMPAT_ENABLED = 'true';
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
      attemptId: undefined,
      challenge: undefined,
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

  it('does not emit completion again for an idempotent attempt replay', async () => {
    gameSaveMock.saveCompletedGame.mockResolvedValue({
      session: { id: 'session_synthetic_1', score: 21 },
      user: { experience: 121, streakDays: 1 },
      isReplay: true,
    });
    const baseUrl = await createGameHarness();
    const token = userToken({ id: 'user_synthetic_game' });
    const response = await postJson(baseUrl, '/api/game/save', token, {
      clientRunId: '11111111-1111-4111-8111-111111111111',
      attemptId: 'attempt-a',
      challenge: 'synthetic-challenge',
      gameType: 'SCHULTE',
      timeMs: 5000,
      metadata: { size: 3 },
    });

    expect(response.status).toBe(200);
    expect(gameSaveMock.saveCompletedGame).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: 'attempt-a', challenge: 'synthetic-challenge',
    }));
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
