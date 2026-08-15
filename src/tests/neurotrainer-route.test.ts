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
  setNeurotrainerHistoryRepository,
} from '../server/infrastructure/container.ts';
import type { NeurotrainerHistoryRepository } from '../server/repositories/neurotrainer-history-repository.ts';

const JWT_SECRET = 'synthetic-neurotrainer-secret';

const serviceMock = vi.hoisted(() => ({
  generateMentalMathTraining: vi.fn(),
  analyzeNeurotraining: vi.fn(),
}));

vi.mock('../server/services/neurotrainer.ts', () => serviceMock);

let routes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  routes = (await import('../server/routes/neurotrainer.ts')).default;
});

beforeEach(() => {
  vi.clearAllMocks();
  setNeurotrainerHistoryRepository({
    findRecentCompletedByGameType: historyFindMock,
  });
  serviceMock.generateMentalMathTraining.mockResolvedValue({
    source: 'fallback',
    set: { legend: {}, questions: [] },
  });
  serviceMock.analyzeNeurotraining.mockResolvedValue({
    source: 'fallback',
    analysis: {
      feedback: 'Стабильная тренировка.',
      recommendations: ['Продолжайте после перерыва.'],
    },
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

const historyFindMock = vi.fn<NeurotrainerHistoryRepository['findRecentCompletedByGameType']>();

async function createHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/neurotrainer', routes);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

async function postJson(baseUrl: string, path: string, body: unknown, token?: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

describe('neurotrainer route', () => {
  it('requires authentication for generation', async () => {
    const baseUrl = await createHarness();
    const response = await postJson(baseUrl, '/api/neurotrainer/mental-math/generate', {
      level: 1,
      count: 20,
    });
    expect(response.status).toBe(401);
    expect(serviceMock.generateMentalMathTraining).not.toHaveBeenCalled();
  });

  it('enforces the 20-question minimum', async () => {
    const baseUrl = await createHarness();
    const token = jwt.sign({ id: 'synthetic-user' }, JWT_SECRET);
    const response = await postJson(baseUrl, '/api/neurotrainer/mental-math/generate', {
      level: 1,
      count: 10,
    }, token);

    expect(response.status).toBe(400);
    expect(serviceMock.generateMentalMathTraining).not.toHaveBeenCalled();
  });

  it('rejects extra identity fields', async () => {
    const baseUrl = await createHarness();
    const token = jwt.sign({ id: 'synthetic-user' }, JWT_SECRET);
    const response = await postJson(baseUrl, '/api/neurotrainer/analyze', {
      gameType: 'SCHULTE_90',
      timeMs: 120000,
      errors: 0,
      brainId: 'must-not-pass',
    }, token);
    expect(response.status).toBe(400);
    expect(serviceMock.analyzeNeurotraining).not.toHaveBeenCalled();
  });

  it('projects stored sessions to privacy-safe aggregate fields', async () => {
    historyFindMock.mockResolvedValue([
      {
        score: 120,
        timeMs: 125000,
        metadata: {
          errors: 2,
          accuracy: 98,
          clickHistory: [{ x: 0.1, y: 0.2 }],
          token: 'must-not-pass',
        },
      },
    ]);
    const baseUrl = await createHarness();
    const token = jwt.sign({ id: 'synthetic-user' }, JWT_SECRET);
    const response = await postJson(baseUrl, '/api/neurotrainer/analyze', {
      gameType: 'SCHULTE_90',
      timeMs: 120000,
      errors: 1,
      correctAnswers: 90,
      totalQuestions: 90,
    }, token);

    expect(response.status).toBe(200);
    expect(serviceMock.analyzeNeurotraining).toHaveBeenCalledWith({
      current: {
        gameType: 'SCHULTE_90',
        timeMs: 120000,
        errors: 1,
        correctAnswers: 90,
        totalQuestions: 90,
      },
      history: [{
        score: 120,
        timeMs: 125000,
        errors: 2,
        accuracy: 98,
      }],
    });
    expect(JSON.stringify(serviceMock.analyzeNeurotraining.mock.calls)).not.toContain('clickHistory');
    expect(JSON.stringify(serviceMock.analyzeNeurotraining.mock.calls)).not.toContain('must-not-pass');
    expect(historyFindMock).toHaveBeenCalledWith('synthetic-user', 'SCHULTE_90', 10);
  });
});
