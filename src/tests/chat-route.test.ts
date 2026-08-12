/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetGameRepositories, setChatRepository } from '../server/infrastructure/container.ts';
import type { ChatRepository } from '../server/repositories/chat-repository.ts';

const JWT_SECRET = 'synthetic-chat-route-secret';
const findHistory = vi.fn<ChatRepository['findRecentGlobalMessages']>();
const findSender = vi.fn<ChatRepository['findSender']>();
const createMessage = vi.fn<ChatRepository['createGlobalMessage']>();
let routes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  routes = (await import('../server/routes/chat.ts')).default;
});

beforeEach(() => {
  vi.clearAllMocks();
  setChatRepository({
    findRecentGlobalMessages: findHistory,
    findSender,
    createGlobalMessage: createMessage,
  });
});

afterEach(async () => {
  resetGameRepositories();
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

async function createHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/chat', routes);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function send(baseUrl: string, content: string, token?: string) {
  const response = await fetch(`${baseUrl}/api/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ content }),
  });
  return { status: response.status, body: await response.json() };
}

describe('chat route persistence contract', () => {
  it('persists an authenticated message after resolving its public sender', async () => {
    findSender.mockResolvedValue({ name: 'Internal', pseudonym: 'Brain Chat' });
    createMessage.mockResolvedValue();
    const baseUrl = await createHarness();
    const token = jwt.sign({ id: 'chat_user' }, JWT_SECRET);

    const response = await send(baseUrl, '  synthetic message  ', token);

    expect(response.status).toBe(200);
    expect(findSender).toHaveBeenCalledWith('chat_user');
    expect(createMessage).toHaveBeenCalledWith('chat_user', 'synthetic message');
    expect(response.body).toMatchObject({ success: true, senderId: expect.any(String) });
    expect(response.body.senderId).not.toContain('chat_user');
  });

  it('broadcasts guest messages without persisting them', async () => {
    const response = await send(await createHarness(), 'guest message');

    expect(response.status).toBe(200);
    expect(createMessage).not.toHaveBeenCalled();
    expect(response.body.senderId).toMatch(/^guest-/);
  });
});
