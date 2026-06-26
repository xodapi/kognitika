/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = 'synthetic-feedback-route-secret';

const prismaMock = vi.hoisted(() => ({
  feedback: {
    create: vi.fn(),
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

let feedbackRoutes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  const module = await import('../server/routes/feedback.ts');
  feedbackRoutes = module.default;
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

async function createFeedbackHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/feedback', feedbackRoutes);

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

describe('feedback route persistence contract', () => {
  it('persists feedback before emitting notification events', async () => {
    prismaMock.feedback.create.mockResolvedValue({ trackingNum: 'FB-SYNTH01' });

    const baseUrl = await createFeedbackHarness();
    const token = userToken({ id: 'user_synthetic_feedback' });

    const response = await postJson(baseUrl, '/api/feedback', token, {
      type: 'bug',
      content: '  Synthetic feedback without personal data.  ',
      rating: 5,
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, trackingNum: 'FB-SYNTH01' });
    expect(prismaMock.feedback.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_synthetic_feedback',
        type: 'bug',
        content: 'Synthetic feedback without personal data.',
        trackingNum: expect.stringMatching(/^FB-[A-Z0-9]{8}$/),
      },
      select: {
        trackingNum: true,
      },
    });
    expect(eventBusMock.emit).toHaveBeenCalledWith('feedback:submitted', {
      userId: 'user_synthetic_feedback',
      trackingNum: 'FB-SYNTH01',
      type: 'bug',
      content: 'Synthetic feedback without personal data.',
    });
  });

  it('rejects invalid feedback without persistence or notifications', async () => {
    const baseUrl = await createFeedbackHarness();
    const token = userToken({ id: 'user_synthetic_feedback' });

    const response = await postJson(baseUrl, '/api/feedback', token, {
      type: 'security',
      content: 'Synthetic invalid feedback.',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
    expect(response.body.details).toBeDefined();
    expect(prismaMock.feedback.create).not.toHaveBeenCalled();
    expect(eventBusMock.emit).not.toHaveBeenCalled();
  });

  it('does not emit notifications when persistence fails', async () => {
    prismaMock.feedback.create.mockRejectedValue(new Error('synthetic db failure'));

    const baseUrl = await createFeedbackHarness();
    const token = userToken({ id: 'user_synthetic_feedback' });

    const response = await postJson(baseUrl, '/api/feedback', token, {
      type: 'idea',
      content: 'Synthetic durable write failure.',
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to save feedback' });
    expect(eventBusMock.emit).not.toHaveBeenCalled();
  });
});
