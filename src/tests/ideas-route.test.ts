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
  setIdeaRepository,
} from '../server/infrastructure/container.ts';
import type { IdeaRepository } from '../server/repositories/idea-repository.ts';

const JWT_SECRET = 'synthetic-ideas-route-secret';

const eventBusMock = vi.hoisted(() => ({
  emit: vi.fn(),
}));

vi.mock('../server/events/event-bus.ts', () => ({
  eventBus: eventBusMock,
}));

let ideaRoutes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  const module = await import('../server/routes/ideas.ts');
  ideaRoutes = module.default;
});

beforeEach(() => {
  vi.clearAllMocks();
  setIdeaRepository({
    findAll: ideaFindAllMock,
    create: ideaCreateMock,
    exists: ideaExistsMock,
    upsertVote: ideaUpsertVoteMock,
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

const ideaFindAllMock = vi.fn<IdeaRepository['findAll']>();
const ideaCreateMock = vi.fn<IdeaRepository['create']>();
const ideaExistsMock = vi.fn<IdeaRepository['exists']>();
const ideaUpsertVoteMock = vi.fn<IdeaRepository['upsertVote']>();

async function createIdeasHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/ideas', ideaRoutes);

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

async function getJson(baseUrl: string, path: string) {
  const response = await fetch(`${baseUrl}${path}`);

  return {
    status: response.status,
    body: await response.json(),
  };
}

describe('ideas route notification contract', () => {
  it('rejects a blank vote identifier before calling Prisma', async () => {
    const baseUrl = await createIdeasHarness();
    const response = await postJson(baseUrl, '/api/ideas/%20/vote', userToken({ id: 'user_synthetic_idea' }), {});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(ideaExistsMock).not.toHaveBeenCalled();
  });

  it('normalizes legacy statuses in list responses', async () => {
    ideaFindAllMock.mockResolvedValue([
      {
        id: 'idea_synthetic_legacy',
        title: 'Synthetic legacy idea',
        description: 'Synthetic legacy idea description.',
        status: 'open',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        user: {
          id: 'user_synthetic_idea',
          name: null,
          pseudonym: 'Brain Synthetic',
          brainId: 'BR-SYNTHETIC-IDEA-SECRET',
        },
        votes: [],
        _count: {
          votes: 0,
        },
      },
    ]);

    const baseUrl = await createIdeasHarness();
    const response = await getJson(baseUrl, '/api/ideas');

    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({
      id: 'idea_synthetic_legacy',
      status: 'PENDING',
    });
    expect(JSON.stringify(response.body)).not.toContain('BR-SYNTHETIC-IDEA-SECRET');
  });

  it('persists an idea before emitting admin notification events', async () => {
    ideaCreateMock.mockResolvedValue({
      id: 'idea_synthetic_1',
      title: 'Synthetic idea title',
      description: 'Synthetic idea description without personal data.',
      status: 'PENDING',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      user: {
        id: 'user_synthetic_idea',
        name: null,
        pseudonym: 'Brain Synthetic',
        brainId: 'BR-SYNTHETIC-IDEA-SECRET',
      },
      votes: [],
      _count: {
        votes: 0,
      },
    });

    const baseUrl = await createIdeasHarness();
    const token = userToken({ id: 'user_synthetic_idea' });

    const response = await postJson(baseUrl, '/api/ideas', token, {
      title: 'Synthetic idea title',
      description: 'Synthetic idea description without personal data.',
    });

    expect(response.status).toBe(201);
    expect(ideaCreateMock).toHaveBeenCalledWith({
      userId: 'user_synthetic_idea',
      title: 'Synthetic idea title',
      description: 'Synthetic idea description without personal data.',
    });
    expect(eventBusMock.emit).toHaveBeenCalledWith('idea:submitted', {
      userId: 'user_synthetic_idea',
      ideaId: 'idea_synthetic_1',
      title: 'Synthetic idea title',
      description: 'Synthetic idea description without personal data.',
    });
    expect(JSON.stringify(response.body)).not.toContain('BR-SYNTHETIC-IDEA-SECRET');
  });

  it('returns 404 without voting when the idea does not exist', async () => {
    ideaExistsMock.mockResolvedValue(false);

    const baseUrl = await createIdeasHarness();
    const response = await postJson(baseUrl, '/api/ideas/missing-idea/vote', userToken({ id: 'user_synthetic_idea' }), {});

    expect(response.status).toBe(404);
    expect(ideaUpsertVoteMock).not.toHaveBeenCalled();
  });

  it('delegates an authenticated vote to the repository after existence checks', async () => {
    ideaExistsMock.mockResolvedValue(true);
    ideaUpsertVoteMock.mockResolvedValue();

    const baseUrl = await createIdeasHarness();
    const response = await postJson(baseUrl, '/api/ideas/idea_synthetic_1/vote', userToken({ id: 'user_synthetic_idea' }), {});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(ideaUpsertVoteMock).toHaveBeenCalledWith('idea_synthetic_1', 'user_synthetic_idea');
  });
});
