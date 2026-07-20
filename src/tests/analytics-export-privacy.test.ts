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
  it('exports only aggregated trainer analytics without identifiers or raw metadata', async () => {
    prismaMock.gameSession.findMany.mockResolvedValue([
      {
        id: 'session_unknown',
        createdAt: new Date('2026-01-04T00:00:00.000Z'),
        gameType: 'UNSUPPORTED_SYNTHETIC_TYPE',
        score: 999,
        timeMs: 1,
        metadata: { userId: 'must-not-export' },
      },
      {
        id: 'session_hype',
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
        gameType: 'HYPE_FILTER',
        score: 80,
        timeMs: 30000,
        metadata: {},
      },
      {
        id: 'session_synthetic_2',
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        gameType: 'SCHULTE',
        score: 120,
        timeMs: 22000,
        metadata: { password: 'nested-password' },
      },
      {
        id: 'session_synthetic_1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        gameType: 'SCHULTE',
        score: 100,
        timeMs: 25000,
        metadata: {
          reactionTimeMs: 500,
          nested: {
            brainId: 'BR-SYNTHETIC-NESTED',
            email: 'nested@example.test',
            token: 'nested-token',
            localStorage: '{"user":"private"}',
          },
        },
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
    expect(body.privacy).toEqual({
      personal_identifiers_included: false,
      raw_session_data_included: false,
      exact_activity_timestamps_included: false,
      safe_for_external_llm: true,
    });
    expect(body).not.toHaveProperty('subject');
    expect(body).not.toHaveProperty('sessions');
    expect(body.dataset).toMatchObject({
      completed_sessions_analyzed: 3,
      modules_with_data: 2,
      history_truncated: false,
      maximum_sessions_analyzed: 1000,
    });
    expect(prismaMock.gameSession.findMany).toHaveBeenCalledWith({
      where: { userId: 'user_synthetic_export', isCompleted: true },
      orderBy: { createdAt: 'desc' },
      take: 1001,
      select: {
        gameType: true,
        score: true,
        timeMs: true,
        createdAt: true,
      },
    });
    expect(body.modules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        module_id: 'schulte',
        trainer: 'Таблицы Шульте',
        completed_sessions: 2,
        score: {
          average: 110,
          best: 120,
          change_percent_early_vs_recent: 20,
        },
        duration_ms: {
          average: 23500,
          best: 22000,
        },
      }),
      expect.objectContaining({
        module_id: 'hype',
        completed_sessions: 1,
      }),
    ]));
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(serialized).not.toContain('BR-SYNTHETIC-EXPORT-SECRET');
    expect(serialized).not.toContain('BR-SYNTHETIC-NESTED');
    expect(serialized).not.toContain('export@example.test');
    expect(serialized).not.toContain('nested@example.test');
    expect(serialized).not.toContain('synthetic-token');
    expect(serialized).not.toContain('nested-token');
    expect(serialized).not.toContain('synthetic-password-hash');
    expect(serialized).not.toContain('nested-password');
    expect(serialized).not.toContain('session_synthetic_1');
    expect(serialized).not.toContain('session_unknown');
    expect(serialized).not.toContain('must-not-export');
    expect(serialized).not.toContain('UNSUPPORTED_SYNTHETIC_TYPE');
    expect(serialized).not.toContain('2026-01-01');
    expect(serialized).not.toContain('localStorage');
  });
});
