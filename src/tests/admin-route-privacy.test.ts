/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = 'synthetic-admin-route-secret';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  feedback: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../lib/prisma.ts', () => ({
  default: prismaMock,
}));

let adminRoutes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  const module = await import('../server/routes/admin.ts');
  adminRoutes = module.default;
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

async function createAdminHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);

  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

function adminToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, JWT_SECRET);
}

async function getJson(baseUrl: string, path: string, token: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    status: response.status,
    body: await response.json(),
  };
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

describe('admin route privacy and authorization contract', () => {
  it('does not trust stale or forged ADMIN role from a signed JWT', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ role: 'USER' });
    const baseUrl = await createAdminHarness();
    const token = adminToken({ id: 'user_synthetic_regular', role: 'ADMIN' });

    const response = await getJson(baseUrl, '/api/admin/users', token);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Access denied' });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user_synthetic_regular' },
      select: { role: true },
    });
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  it('filters sensitive identity fields from /api/admin/users responses', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'user_synthetic_admin_view',
        name: 'Legacy Admin Visible',
        pseudonym: 'Brain Synthetic',
        brainId: 'BR-SYNTHETIC-SECRET-001',
        email: 'synthetic@example.test',
        password: 'synthetic-password-hash',
        token: 'synthetic-token',
        level: 4,
        experience: 120,
        rating: 1020,
        streakDays: 3,
        role: 'USER',
        createdAt: '2026-01-01T00:00:00.000Z',
        sessions: [],
      },
    ]);

    const baseUrl = await createAdminHarness();
    const token = adminToken({ id: 'user_synthetic_admin', role: 'ADMIN' });

    const response = await getJson(baseUrl, '/api/admin/users', token);
    const serialized = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({
      id: 'user_synthetic_admin_view',
      displayName: 'Brain Synthetic',
      brainLabel: 'Brain BR-SYNTH',
      pseudonym: 'Brain Synthetic',
      level: 4,
      rating: 1020,
    });
    expect(serialized).not.toContain('synthetic@example.test');
    expect(serialized).not.toContain('synthetic-password-hash');
    expect(serialized).not.toContain('synthetic-token');
    expect(serialized).not.toContain('BR-SYNTHETIC-SECRET-001');
  });

  it('filters sensitive identity fields from /api/admin/feedback responses', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    prismaMock.feedback.findMany.mockResolvedValue([
      {
        id: 'feedback_synthetic_1',
        type: 'idea',
        content: 'Synthetic feedback only.',
        adminResponse: null,
        status: 'new',
        trackingNum: 'FB-SYNTH',
        createdAt: '2026-01-01T00:00:00.000Z',
        user: {
          id: 'user_synthetic_feedback',
          name: 'Legacy Feedback Visible',
          pseudonym: 'Brain Feedback',
          brainId: 'BR-SYNTHETIC-FEEDBACK-SECRET',
          email: 'feedback@example.test',
          password: 'synthetic-password-hash',
          token: 'synthetic-token',
        },
      },
    ]);

    const baseUrl = await createAdminHarness();
    const token = adminToken({ id: 'user_synthetic_admin', role: 'ADMIN' });

    const response = await getJson(baseUrl, '/api/admin/feedback', token);
    const serialized = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(response.body[0].user).toEqual({
      name: 'Brain Feedback',
      pseudonym: 'Brain Feedback',
      brainLabel: 'Brain BR-SYNTH',
    });
    expect(serialized).not.toContain('feedback@example.test');
    expect(serialized).not.toContain('synthetic-password-hash');
    expect(serialized).not.toContain('synthetic-token');
    expect(serialized).not.toContain('BR-SYNTHETIC-FEEDBACK-SECRET');
  });

  it('validates and sanitizes /api/admin/feedback/:id/response', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    prismaMock.feedback.update.mockResolvedValue({
      id: 'feedback_synthetic_1',
      type: 'bug',
      content: 'Synthetic feedback only.',
      adminResponse: 'Synthetic admin response.',
      status: 'replied',
      trackingNum: 'FB-SYNTH',
      createdAt: '2026-01-01T00:00:00.000Z',
      userId: 'user_synthetic_feedback',
      user: {
        id: 'user_synthetic_feedback',
        name: 'Legacy Feedback Visible',
        pseudonym: 'Brain Feedback',
        brainId: 'BR-SYNTHETIC-FEEDBACK-SECRET',
        email: 'feedback@example.test',
        token: 'synthetic-token',
      },
    });

    const baseUrl = await createAdminHarness();
    const token = adminToken({ id: 'user_synthetic_admin', role: 'ADMIN' });

    const invalid = await postJson(baseUrl, '/api/admin/feedback/feedback_synthetic_1/response', token, {
      response: '',
    });
    expect(invalid.status).toBe(400);
    expect(prismaMock.feedback.update).not.toHaveBeenCalled();

    const response = await postJson(baseUrl, '/api/admin/feedback/feedback_synthetic_1/response', token, {
      response: '  Synthetic admin response.  ',
    });
    const serialized = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(prismaMock.feedback.update).toHaveBeenCalledWith({
      where: { id: 'feedback_synthetic_1' },
      data: { adminResponse: 'Synthetic admin response.', status: 'replied' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            pseudonym: true,
            brainId: true,
          },
        },
      },
    });
    expect(response.body.feedback).toMatchObject({
      id: 'feedback_synthetic_1',
      text: 'Synthetic feedback only.',
      adminResponse: 'Synthetic admin response.',
      status: 'replied',
      trackingNum: 'FB-SYNTH',
      user: {
        name: 'Brain Feedback',
        pseudonym: 'Brain Feedback',
        brainLabel: 'Brain BR-SYNTH',
      },
    });
    expect(serialized).not.toContain('feedback@example.test');
    expect(serialized).not.toContain('synthetic-token');
    expect(serialized).not.toContain('BR-SYNTHETIC-FEEDBACK-SECRET');
    expect(serialized).not.toContain('user_synthetic_feedback');
  });
});
