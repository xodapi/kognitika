/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFatigueCurveSession, type SessionAnalyticsJob } from '../core/analyze-session/index.ts';
import {
  resetGameRepositories,
  setAnalyticsSessionOwnershipRepository,
} from '../server/infrastructure/container.ts';
import type { AnalyticsSessionOwnershipRepository } from '../server/repositories/analytics-session-ownership-repository.ts';

const JWT_SECRET = 'synthetic-analytics-ownership-secret';
const prismaMock = vi.hoisted(() => ({
  gameSession: {
    findFirst: vi.fn(),
  },
  sessionAnalyticsSummary: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('../lib/prisma.ts', () => ({ default: prismaMock }));

let analyticsRoutes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  analyticsRoutes = (await import('../server/routes/analytics.ts')).default;
});

beforeEach(() => {
  vi.clearAllMocks();
  setAnalyticsSessionOwnershipRepository({
    isOwnedBy: ownershipCheck,
  });
  prismaMock.sessionAnalyticsSummary.upsert.mockImplementation(({ create }) => Promise.resolve({
    userId: create.userId,
    sourceSessionId: create.sourceSessionId,
  }));
  prismaMock.sessionAnalyticsSummary.findMany.mockResolvedValue([]);
});

afterEach(async () => {
  resetGameRepositories();
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  })));
});

const ownershipCheck = vi.fn<AnalyticsSessionOwnershipRepository['isOwnedBy']>();

async function createHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/analytics', analyticsRoutes);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function token(userId: string) {
  return jwt.sign({ id: userId }, JWT_SECRET);
}

function analyticsJob(): SessionAnalyticsJob {
  const session = createFatigueCurveSession();
  return {
    schemaVersion: 1,
    jobId: 'analytics-job-route-ownership-001',
    analyzerVersion: 'analyze-session-v1',
    receivedAt: '2026-07-31T00:00:00.000Z',
    session,
  };
}

describe('analytics summary ownership routes', () => {
  it('rejects unauthenticated summary ingestion', async () => {
    const baseUrl = await createHarness();
    const response = await fetch(`${baseUrl}/api/analytics/summaries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analyticsJob()),
    });

    expect(response.status).toBe(401);
    expect(prismaMock.sessionAnalyticsSummary.upsert).not.toHaveBeenCalled();
  });

  it('rejects a session not owned by the authenticated user', async () => {
    ownershipCheck.mockResolvedValue(false);
    const baseUrl = await createHarness();
    const response = await fetch(`${baseUrl}/api/analytics/summaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token('user-a')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analyticsJob()),
    });

    expect(response.status).toBe(403);
    expect(ownershipCheck).toHaveBeenCalledWith(analyticsJob().session.sessionId, 'user-a');
    expect(prismaMock.sessionAnalyticsSummary.upsert).not.toHaveBeenCalled();
  });

  it('persists an owned session with authoritative user ownership', async () => {
    ownershipCheck.mockResolvedValue(true);
    const baseUrl = await createHarness();
    const response = await fetch(`${baseUrl}/api/analytics/summaries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token('user-a')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analyticsJob()),
    });

    expect(response.status).toBe(201);
    const call = prismaMock.sessionAnalyticsSummary.upsert.mock.calls[0][0];
    expect(call.create.userId).toBe('user-a');
  });

  it('rejects malformed summary and query input before data access', async () => {
    const baseUrl = await createHarness();
    const auth = { Authorization: `Bearer ${token('user-a')}`, 'Content-Type': 'application/json' };

    const summaryResponse = await fetch(`${baseUrl}/api/analytics/summaries`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({}),
    });
    const queryResponse = await fetch(`${baseUrl}/api/analytics/summaries?limit=0`, { headers: auth });
    const trendResponse = await fetch(`${baseUrl}/api/analytics/cognitive-trend?days=not-a-number`, { headers: auth });
    const compareResponse = await fetch(`${baseUrl}/api/analytics/compare?score=-1`, { headers: auth });

    expect(summaryResponse.status).toBe(400);
    expect(queryResponse.status).toBe(400);
    expect(trendResponse.status).toBe(400);
    expect(compareResponse.status).toBe(400);
    expect(ownershipCheck).not.toHaveBeenCalled();
    expect(prismaMock.sessionAnalyticsSummary.findMany).not.toHaveBeenCalled();
  });

  it('scopes summary and trend reads to the authenticated user', async () => {
    const baseUrl = await createHarness();
    const auth = { Authorization: `Bearer ${token('user-a')}` };

    const summaryResponse = await fetch(`${baseUrl}/api/analytics/summaries`, { headers: auth });
    const trendResponse = await fetch(`${baseUrl}/api/analytics/summaries/trend?moduleId=nback&days=7`, { headers: auth });
    const cognitiveResponse = await fetch(`${baseUrl}/api/analytics/cognitive-trend?days=14`, { headers: auth });

    expect(summaryResponse.status).toBe(200);
    expect(trendResponse.status).toBe(200);
    expect(cognitiveResponse.status).toBe(200);
    expect(prismaMock.sessionAnalyticsSummary.findMany.mock.calls).toHaveLength(3);
    for (const [call] of prismaMock.sessionAnalyticsSummary.findMany.mock.calls) {
      expect(call.where.userId).toBe('user-a');
    }
  });
});
