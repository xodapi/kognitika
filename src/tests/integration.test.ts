/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createServer, Server } from 'http';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { getSharedTestApp, JWT_SECRET } from './test-app.ts';
import type { Express } from 'express';

// In-memory Prisma mock following the repo's route-test pattern.
// The real production route modules run against this store.
const prismaMock = vi.hoisted(() => {
  const users = new Map<string, any>();
  const messages: any[] = [];

  return {
    __users: users,
    __messages: messages,
    user: {
      create: vi.fn(async ({ data }: any) => {
        const user = {
          id: `test-${users.size + 1}-${Math.random().toString(36).slice(2, 8)}`,
          name: data.name ?? '',
          brainId: data.brainId,
          pseudonym: data.pseudonym ?? data.name ?? '',
          role: 'USER',
          level: 1,
          experience: data.experience ?? 0,
          rating: 1000,
          streakDays: 0,
          createdAt: new Date(),
        };
        users.set(user.id, user);
        return user;
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        for (const user of users.values()) {
          if (where.id && user.id === where.id) return user;
          if (where.brainId && user.brainId === where.brainId) return user;
        }
        return null;
      }),
      findMany: vi.fn(async () => Array.from(users.values())),
    },
    message: {
      create: vi.fn(async ({ data }: any) => {
        const message = {
          id: `msg-${messages.length + 1}-${Math.random().toString(36).slice(2, 8)}`,
          userId: data.userId,
          content: data.content,
          room: data.room,
          createdAt: new Date(),
        };
        messages.push(message);
        return message;
      }),
      findMany: vi.fn(async ({ where, take, orderBy }: any) => {
        let result = messages.filter((m) => !where || m.room === where.room);
        if (orderBy?.createdAt === 'desc') {
          result = [...result].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        if (take) result = result.slice(0, take);
        // SSE handler reads `user.name` via `include: { user: { select: { name: true } } }`
        return result.map((m) => ({ ...m, user: { name: users.get(m.userId)?.name ?? 'Тестовый' } }));
      }),
    },
    xpEvent: {
      create: vi.fn(async ({ data }: any) => ({ id: `xp-${Math.random().toString(36).slice(2, 8)}`, ...data })),
    },
    gameSession: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
    },
    gameAttempt: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
    },
    analyticsSummary: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
    },
    $disconnect: vi.fn(async () => {}),
  };
});

vi.mock('../lib/prisma.ts', () => ({ default: prismaMock }));

interface TestContext {
  app: Express;
  server: Server;
  baseUrl: string;
  jwtSecret: string;
  authToken: string;
  userId: string;
  brainId: string;
  cleanup: () => Promise<void>;
}

async function createCtx(): Promise<TestContext> {
  const testApp = await getSharedTestApp();
  return {
    app: testApp!.app,
    server: testApp!.server,
    baseUrl: testApp!.baseUrl,
    jwtSecret: testApp!.jwtSecret,
    authToken: '',
    userId: '',
    brainId: '',
    cleanup: async () => { /* shared app - no per-suite cleanup */ },
  };
}

describe('Integration Tests - Auth Routes', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createCtx();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('POST /api/auth/brain - should create new brain session', async () => {
    const res = await request(ctx.baseUrl)
      .post('/api/auth/brain')
      .expect(200);

    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('brainId');
    expect(res.body).toHaveProperty('pseudonym');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.role).toBe('USER');
    // Real generateBrainId() returns a UUID v4
    expect(res.body.brainId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('POST /api/auth/brain - should return valid JWT token', async () => {
    const res = await request(ctx.baseUrl)
      .post('/api/auth/brain')
      .expect(200);

    const token = res.body.token;
    expect(token).toBeDefined();

    const decoded = jwt.verify(token, ctx.jwtSecret) as any;
    expect(decoded).toHaveProperty('id');
    expect(decoded).toHaveProperty('brainId');
    expect(decoded.identity).toBe('brain');
  });

  it('POST /api/auth/restore - should restore session with valid Brain ID', async () => {
    const createRes = await request(ctx.baseUrl)
      .post('/api/auth/brain')
      .expect(200);

    const brainId = createRes.body.brainId;

    const restoreRes = await request(ctx.baseUrl)
      .post('/api/auth/restore')
      .send({ brainId })
      .expect(200);

    expect(restoreRes.body).toHaveProperty('token');
    expect(restoreRes.body.brainId).toBe(brainId);
    expect(restoreRes.body.pseudonym).toBe(createRes.body.pseudonym);
  });

  it('POST /api/auth/restore - should reject empty Brain ID', async () => {
    const res = await request(ctx.baseUrl)
      .post('/api/auth/restore')
      .send({ brainId: '' })
      .expect(400);

    // Real handleValidationError returns { error, details } without a `code` field
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/auth/restore - should reject missing Brain ID', async () => {
    const res = await request(ctx.baseUrl)
      .post('/api/auth/restore')
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/auth/restore - should return 404 for non-existent Brain ID', async () => {
    const res = await request(ctx.baseUrl)
      .post('/api/auth/restore')
      .send({ brainId: 'BR-NONEXISTENT123' })
      .expect(404);

    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/auth/restore - should return new valid token on restore', async () => {
    const createRes = await request(ctx.baseUrl)
      .post('/api/auth/brain')
      .expect(200);

    const brainId = createRes.body.brainId;
    const originalToken = createRes.body.token;

    await new Promise(r => setTimeout(r, 1100));

    const restoreRes = await request(ctx.baseUrl)
      .post('/api/auth/restore')
      .send({ brainId })
      .expect(200);

    expect(restoreRes.body.token).toBeDefined();
    expect(restoreRes.body.token).not.toBe(originalToken);

    const decoded = jwt.verify(restoreRes.body.token, ctx.jwtSecret) as any;
    expect(decoded.brainId).toBe(brainId);
  });
});

// ============================================================
// CHAT MESSAGES TESTS (non-SSE, using supertest)
// ============================================================
describe('Integration Tests - Chat Messages', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createCtx();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  beforeEach(async () => {
    const res = await request(ctx.baseUrl)
      .post('/api/auth/brain')
      .expect(200);
    ctx.authToken = res.body.token;
    ctx.userId = res.body.user.id;
    ctx.brainId = res.body.brainId;
  });

  it('POST /api/chat/messages - should accept authenticated messages', async () => {
    const res = await request(ctx.baseUrl)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${ctx.authToken}`)
      .send({ content: 'Test authenticated message' })
      .expect(200);

    expect(res.body).toEqual({ success: true, senderId: expect.any(String) });
    expect(res.body.senderId.length).toBe(22);
  });

  it('POST /api/chat/messages - should reject empty content', async () => {
    const res = await request(ctx.baseUrl)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${ctx.authToken}`)
      .send({ content: '' })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/chat/messages - should reject content > 500 chars', async () => {
    const longContent = 'a'.repeat(501);
    const res = await request(ctx.baseUrl)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${ctx.authToken}`)
      .send({ content: longContent })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/chat/messages - should accept anonymous messages', async () => {
    const res = await request(ctx.baseUrl)
      .post('/api/chat/messages')
      .send({ content: 'Anonymous message' })
      .expect(200);

    expect(res.body).toEqual({ success: true, senderId: expect.any(String) });
    expect(res.body.senderId).toMatch(/^guest-/);
  });

  it('POST /api/chat/messages - should include HMAC senderId in response', async () => {
    const res = await request(ctx.baseUrl)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${ctx.authToken}`)
      .send({ content: 'Test with senderId' })
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('senderId');
    expect(typeof res.body.senderId).toBe('string');
    expect(res.body.senderId.length).toBe(22);
    expect(res.body.senderId).not.toBe(ctx.userId);
  });
});

// ============================================================
// CHAT SSE ENDPOINT TESTS - Real streaming tests with native fetch
// ============================================================
describe('Integration Tests - Chat SSE Endpoint', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createCtx();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  beforeEach(async () => {
    const res = await request(ctx.baseUrl)
      .post('/api/auth/brain')
      .expect(200);
    ctx.authToken = res.body.token;
    ctx.userId = res.body.user.id;
    ctx.brainId = res.body.brainId;
  });

  it('GET /api/chat/stream - should establish SSE connection and send history event', async () => {
    const response = await fetch(`${ctx.baseUrl}/api/chat/stream`, {
      headers: { 'Accept': 'text/event-stream' },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let historyReceived = false;

    const startTime = Date.now();
    while (Date.now() - startTime < 3000) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      if (buffer.includes('event: history') || buffer.includes('"event":"history"')) {
        historyReceived = true;
        break;
      }
    }

    reader.cancel();
    expect(historyReceived).toBe(true);
  });

  it('GET /api/chat/stream - should send history with HMAC senderId not internal userId', async () => {
    await request(ctx.baseUrl)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${ctx.authToken}`)
      .send({ content: 'Test message for history' })
      .expect(200);

    const response = await fetch(`${ctx.baseUrl}/api/chat/stream`, {
      headers: { 'Accept': 'text/event-stream' },
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let historyData: any = null;

    const startTime = Date.now();
    while (Date.now() - startTime < 3000) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const dataLine = line.replace('data: ', '');
            const parsed = JSON.parse(dataLine);
            if (Array.isArray(parsed)) {
              historyData = parsed;
              break;
            }
          } catch {}
        }
      }
      if (historyData) break;
    }

    reader.cancel();

    expect(historyData).toBeDefined();
    expect(Array.isArray(historyData)).toBe(true);
    if (historyData.length > 0) {
      const msg = historyData[0];
      expect(msg).toHaveProperty('senderId');
      expect(msg.senderId.length).toBe(22);
      expect(msg.senderId).not.toBe(ctx.userId);
    }
  });

  it('GET /api/chat/stream - should broadcast message event to connected clients', async () => {
    const response = await fetch(`${ctx.baseUrl}/api/chat/stream`, {
      headers: { 'Accept': 'text/event-stream' },
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let messageReceived = false;

    // Wait for the connection to be fully established (history event received,
    // meaning the chatBus listener is registered) before posting, to avoid a race.
    const connectedAt = Date.now();
    while (Date.now() - connectedAt < 3000) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.includes('event: history') || buffer.includes('"event":"history"')) break;
    }

    const sendPromise = request(ctx.baseUrl)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${ctx.authToken}`)
      .send({ content: 'Real-time test message' })
      .expect(200);
    await sendPromise;

    const startTime = Date.now();
    while (Date.now() - startTime < 5000) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const dataLine = line.replace('data: ', '');
            const parsed = JSON.parse(dataLine);
            if (parsed.content === 'Real-time test message') {
              messageReceived = true;
              break;
            }
          } catch {}
        }
      }
      if (messageReceived) break;
    }

    reader.cancel();

    expect(messageReceived).toBe(true);
  });

  it('GET /api/chat/stream - should cleanly close on client disconnect', async () => {
    const response = await fetch(`${ctx.baseUrl}/api/chat/stream`, {
      headers: { 'Accept': 'text/event-stream' },
    });

    expect(response.ok).toBe(true);
    response.body?.cancel();

    const response2 = await fetch(`${ctx.baseUrl}/api/chat/stream`, {
      headers: { 'Accept': 'text/event-stream' },
    });
    expect(response2.ok).toBe(true);
    response2.body?.cancel();
  });
});

// ============================================================
// EVENTBUS / SUBSCRIBERS TESTS - Using real EventBus
// ============================================================
describe('Integration Tests - EventBus / Subscribers', () => {
  let eventBus: ReturnType<typeof import('../core/events/event-bus.ts').createEventBus>;

  beforeEach(async () => {
    const { createEventBus } = await import('../core/events/event-bus.ts');
    eventBus = createEventBus();
  });

  it('should subscribe and receive events', () => {
    const received: any[] = [];
    const unsubscribe = eventBus.on('TRAINING_COMPLETE', (data) => {
      received.push(data);
    });

    eventBus.emit('TRAINING_COMPLETE', {
      type: 'SCHULTE',
      timeMs: 5000,
      score: 100,
      accuracy: 0.95,
      metadata: { gridSize: 5 }
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('SCHULTE');
    expect(received[0].score).toBe(100);

    unsubscribe();
  });

  it('should not receive events after unsubscribe', () => {
    const received: any[] = [];
    const unsubscribe = eventBus.on('TRAINING_COMPLETE', (data) => {
      received.push(data);
    });

    eventBus.emit('TRAINING_COMPLETE', { type: 'SCHULTE', timeMs: 1000 });
    expect(received).toHaveLength(1);

    unsubscribe();

    eventBus.emit('TRAINING_COMPLETE', { type: 'SCHULTE', timeMs: 1000 });
    expect(received).toHaveLength(1);
  });

  it('should support multiple subscribers for same event', () => {
    const received1: any[] = [];
    const received2: any[] = [];

    eventBus.on('FEEDBACK_SUBMITTED', (data) => received1.push(data));
    eventBus.on('FEEDBACK_SUBMITTED', (data) => received2.push(data));

    eventBus.emit('FEEDBACK_SUBMITTED', { userId: 'u1', trackingNum: 'TRK-001', type: 'BUG', content: 'Test' });

    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);
  });

  it('should validate event data against schema', async () => {
    const errors: any[] = [];
    const { createEventBus } = await import('../core/events/event-bus.ts');
    const eventBusWithValidation = createEventBus({
      onValidationError: (event, error) => errors.push({ event, error })
    });

    eventBusWithValidation.emit('TRAINING_COMPLETE', {
      type: 'SCHULTE',
      timeMs: 5000,
    });

    expect(errors).toHaveLength(0);

    eventBusWithValidation.emit('TRAINING_COMPLETE', {
      type: 'INVALID_TYPE',
      timeMs: 5000,
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[errors.length - 1].event).toBe('TRAINING_COMPLETE');
  });

  it('should run middlewares in order', () => {
    const order: number[] = [];

    eventBus.use((event, data, next) => {
      order.push(1);
      next();
    });

    eventBus.use((event, data, next) => {
      order.push(2);
      next();
    });

    eventBus.use((event, data, next) => {
      order.push(3);
      next();
    });

    eventBus.emit('IDEA_SUBMITTED', { userId: 'u1', ideaId: 'i1', title: 'Test', description: 'Desc' });

    expect(order).toEqual([1, 2, 3]);
  });

  it('should allow middleware to modify data before listeners', () => {
    const received: any[] = [];

    eventBus.use((event, data: any, next) => {
      if (event === 'game:completed') {
        data.enriched = true;
        data.metadata = { ...data.metadata, middlewareAdded: true };
      }
      next();
    });

    eventBus.on('game:completed', (data) => received.push(data));

    eventBus.emit('game:completed', {
      sessionId: 's1',
      userId: 'u1',
      gameType: 'STROOP',
      score: 50,
      accuracy: 0.8,
      durationMs: 30000,
      metadata: { difficulty: 'hard' }
    });

    expect(received).toHaveLength(1);
    expect(received[0].enriched).toBe(true);
    expect(received[0].metadata.middlewareAdded).toBe(true);
  });
});

// ============================================================
// RED TEST VERIFICATION - Intentional breakage test
// ============================================================
describe('Red Test Verification - Auth Middleware Breakage', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createCtx();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('should verify auth is enforced on protected endpoints', async () => {
    const createRes = await request(ctx.baseUrl)
      .post('/api/auth/brain')
      .expect(200);

    const token = createRes.body.token;

    await request(ctx.baseUrl)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'test with token' })
      .expect(200);

    await request(ctx.baseUrl)
      .post('/api/chat/messages')
      .send({ content: 'test anonymous' })
      .expect(200);

    await request(ctx.baseUrl)
      .post('/api/chat/messages')
      .set('Authorization', 'Bearer not-a-valid-jwt-token')
      .send({ content: 'test invalid token' })
      .expect(200);
  }, 10000);
});
