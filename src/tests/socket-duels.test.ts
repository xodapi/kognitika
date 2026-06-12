/**
 * @vitest-environment node
 */
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { Server as SocketServer } from 'socket.io';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDuelState, registerDuelHandlers } from '../server/realtime/duels.ts';

const JWT_SECRET = 'synthetic-test-secret';

interface SyntheticUser {
  id: string;
  name: string | null;
  pseudonym: string | null;
  brainId: string | null;
  rating: number;
  role: string;
}

interface Harness {
  url: string;
  io: SocketServer;
  httpServer: HttpServer;
  prisma: ReturnType<typeof createPrismaMock>;
  close(): Promise<void>;
}

const harnesses: Harness[] = [];

function syntheticUsers() {
  return new Map<string, SyntheticUser>([
    ['u1', { id: 'u1', name: null, pseudonym: 'Brain Alpha', brainId: 'BR-SYNTHETIC-ALPHA', rating: 1000, role: 'USER' }],
    ['u2', { id: 'u2', name: null, pseudonym: 'Brain Beta', brainId: 'BR-SYNTHETIC-BETA', rating: 1020, role: 'USER' }],
    ['u3', { id: 'u3', name: null, pseudonym: 'Brain Gamma', brainId: 'BR-SYNTHETIC-GAMMA', rating: 1010, role: 'USER' }],
  ]);
}

function createPrismaMock(users = syntheticUsers()) {
  const findUnique = vi.fn(async (args: any) => {
    const user = users.get(args.where.id);
    if (!user) return null;
    return { ...user };
  });

  const update = vi.fn(async (args: any) => {
    const user = users.get(args.where.id);
    if (!user) return null;

    const nextUser = {
      ...user,
      rating: typeof args.data.rating === 'number' ? args.data.rating : user.rating,
    };
    users.set(user.id, nextUser);
    return { ...nextUser };
  });

  return {
    user: { findUnique, update },
    $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations)),
  };
}

async function createHarness(): Promise<Harness> {
  const httpServer = createServer();
  const io = new SocketServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });
  const prisma = createPrismaMock();

  registerDuelHandlers(io, {
    jwtSecret: JWT_SECRET,
    prisma,
    logger: { log: vi.fn() },
  }, createDuelState());

  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', resolve);
  });

  const { port } = httpServer.address() as AddressInfo;
  const harness: Harness = {
    url: `http://127.0.0.1:${port}`,
    io,
    httpServer,
    prisma,
    async close() {
      await new Promise<void>((resolve) => io.close(() => resolve()));
      if (httpServer.listening) {
        await new Promise<void>((resolve, reject) => {
          httpServer.close((error) => (error ? reject(error) : resolve()));
        });
      }
    },
  };

  harnesses.push(harness);
  return harness;
}

function waitForEvent<T = any>(socket: ClientSocket, event: string, timeoutMs = 1500): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);

    const onEvent = (payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    };

    socket.once(event, onEvent);
  });
}

async function connectClient(url: string, userId: string) {
  const token = jwt.sign({ id: userId }, JWT_SECRET);
  const socket = createClient(url, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  });

  await waitForEvent(socket, 'connect');
  return socket;
}

async function matchTwoPlayers(alice: ClientSocket, bob: ClientSocket) {
  const aliceMatched = waitForEvent<{ roomId: string }>(alice, 'duel:matched');
  const bobMatched = waitForEvent<{ roomId: string }>(bob, 'duel:matched');

  alice.emit('duel:matchmake');
  bob.emit('duel:matchmake');

  const [aliceMatch, bobMatch] = await Promise.all([aliceMatched, bobMatched]);
  expect(aliceMatch.roomId).toBe(bobMatch.roomId);
  return aliceMatch.roomId;
}

afterEach(async () => {
  await Promise.all(harnesses.splice(0).map((harness) => harness.close()));
});

describe('Socket.io duel trust boundary', () => {
  it('rejects unauthenticated and invalid-token sockets', async () => {
    const { url } = await createHarness();

    const missingTokenSocket = createClient(url, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    const missingTokenError = await waitForEvent<Error>(missingTokenSocket, 'connect_error');
    expect(missingTokenError.message).toBe('Unauthorized');
    missingTokenSocket.disconnect();

    const invalidTokenSocket = createClient(url, {
      auth: { token: 'not-a-valid-jwt' },
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    const invalidTokenError = await waitForEvent<Error>(invalidTokenSocket, 'connect_error');
    expect(invalidTokenError.message).toBe('Unauthorized');
    invalidTokenSocket.disconnect();
  });

  it('does not allow a third authenticated user to join or report progress for another duel', async () => {
    const { url } = await createHarness();
    const alice = await connectClient(url, 'u1');
    const bob = await connectClient(url, 'u2');
    const charlie = await connectClient(url, 'u3');
    const roomId = await matchTwoPlayers(alice, bob);

    const joinError = waitForEvent<{ error: string }>(charlie, 'duel:error');
    charlie.emit('duel:join', { roomId });
    await expect(joinError).resolves.toEqual({ error: 'Room access denied' });

    const progressError = waitForEvent<{ error: string }>(charlie, 'duel:error');
    charlie.emit('duel:progress', { roomId, progress: 100 });
    await expect(progressError).resolves.toEqual({ error: 'Room access denied' });

    alice.disconnect();
    bob.disconnect();
    charlie.disconnect();
  });

  it('uses server-side membership and monotonic clamped progress for matched players', async () => {
    const { url, prisma } = await createHarness();
    const alice = await connectClient(url, 'u1');
    const bob = await connectClient(url, 'u2');
    const roomId = await matchTwoPlayers(alice, bob);

    const opponentJoined = waitForEvent<{ userId: string }>(alice, 'duel:opponent-joined');
    alice.emit('duel:join', { roomId });
    await new Promise((resolve) => setTimeout(resolve, 10));
    bob.emit('duel:join', { roomId });
    await expect(opponentJoined).resolves.toEqual({ userId: 'u2' });

    const invalidProgress = waitForEvent<{ error: string }>(alice, 'duel:error');
    alice.emit('duel:progress', { roomId, progress: '100' });
    await expect(invalidProgress).resolves.toEqual({ error: 'Invalid progress' });

    const progressEvents: number[] = [];
    bob.on('duel:opponent-progress', ({ progress }: { progress: number }) => {
      progressEvents.push(progress);
    });

    alice.emit('duel:progress', { roomId, progress: 40, userId: 'u3', score: 999999 });
    await waitForEvent(bob, 'duel:opponent-progress');

    alice.emit('duel:progress', { roomId, progress: 20 });
    await waitForEvent(bob, 'duel:opponent-progress');

    alice.emit('duel:progress', { roomId, progress: 150 });
    await waitForEvent(bob, 'duel:opponent-progress');

    expect(progressEvents).toEqual([40, 40, 100]);
    expect(prisma.$transaction).toHaveBeenCalledOnce();

    alice.disconnect();
    bob.disconnect();
  });
});
