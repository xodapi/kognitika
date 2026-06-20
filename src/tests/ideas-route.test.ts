/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = 'synthetic-ideas-route-secret';

const prismaMock = vi.hoisted(() => ({
  idea: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  ideaVote: {
    upsert: vi.fn(),
  },
}));

const eventBusMock = vi.hoisted(() => ({
  emit: vi.fn(),
}));

vi.mock('../lib/prisma.ts', () => ({
  default: prismaMock,
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
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => (
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })
  )));
});

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
  it('normalizes legacy statuses in list responses', async () => {
    prismaMock.idea.findMany.mockResolvedValue([
      {
        id: 'idea_synthetic_legacy',
        title: 'Synthetic legacy idea',
        description: 'Synthetic legacy idea description.',
        status: 'open',
        createdAt: '2026-01-01T00:00:00.000Z',
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
    prismaMock.idea.create.mockResolvedValue({
      id: 'idea_synthetic_1',
      title: 'Synthetic idea title',
      description: 'Synthetic idea description without personal data.',
      status: 'PENDING',
      createdAt: '2026-01-01T00:00:00.000Z',
      user: {
        id: 'user_synthetic_idea',
        name: null,
        pseudonym: 'Brain Synthetic',
        brainId: 'BR-SYNTHETIC-IDEA-SECRET',
      },
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
    expect(prismaMock.idea.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_synthetic_idea',
        title: 'Synthetic idea title',
        description: 'Synthetic idea description without personal data.',
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            pseudonym: true,
            brainId: true,
          },
        },
        _count: {
          select: { votes: true },
        },
      },
    });
    expect(eventBusMock.emit).toHaveBeenCalledWith('idea:submitted', {
      userId: 'user_synthetic_idea',
      ideaId: 'idea_synthetic_1',
      title: 'Synthetic idea title',
      description: 'Synthetic idea description without personal data.',
    });
    expect(JSON.stringify(response.body)).not.toContain('BR-SYNTHETIC-IDEA-SECRET');
  });
});
