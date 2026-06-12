import jwt from 'jsonwebtoken';
import type { Server } from 'socket.io';
import { generateExpectedSequence } from '../../lib/schulte-generator';

const DUEL_SIZE = 5;
const DUEL_MODE = 'classic';
const DUEL_MIN_FINISH_MS = 3000;
const DUEL_MAX_EVENTS_PER_SECOND = 15;

interface MatchmakingUser {
  socketId: string;
  userId: string;
  rating: number;
  name: string;
}

interface ActiveDuel {
  players: string[];
  userIds: string[];
  ratings: number[];
  progress: Map<string, number>;
  acceptedClicks: Map<string, number>;
  joinedUserIds: Set<string>;
  firstClickAtMs: Map<string, number>;
  eventBuckets: Map<string, { windowStartedAtMs: number; count: number }>;
  sequence: ReturnType<typeof generateExpectedSequence>;
  isFinished: boolean;
}

interface SocketUser {
  id: string;
  name: string | null;
  pseudonym: string | null;
  brainId: string | null;
  rating: number | null;
  role: string | null;
}

interface DuelPrisma {
  user: {
    findUnique(args: unknown): Promise<any>;
    update(args: unknown): unknown;
  };
  $transaction(args: unknown[]): Promise<unknown>;
}

export interface DuelRuntimeState {
  matchmakingQueue: MatchmakingUser[];
  activeDuels: Map<string, ActiveDuel>;
}

interface RegisterDuelHandlersOptions {
  jwtSecret: string;
  prisma: DuelPrisma;
  logger?: Pick<Console, 'log'>;
  now?: () => number;
}

export function createDuelState(): DuelRuntimeState {
  return {
    matchmakingQueue: [],
    activeDuels: new Map(),
  };
}

function getSocketUser(socket: { data: { user?: SocketUser } }) {
  if (!socket.data.user) {
    throw new Error('Socket user missing after auth middleware');
  }

  return socket.data.user;
}

function displayNameFor(user: SocketUser) {
  return user.pseudonym || user.name || `Brain ${user.id.slice(0, 8)}`;
}

function participantIndex(duel: ActiveDuel, userId: string) {
  return duel.userIds.findIndex((id) => id === userId);
}

function verifiedProgressFor(duel: ActiveDuel, userId: string) {
  const acceptedClicks = duel.acceptedClicks.get(userId) || 0;
  return Math.min(100, (acceptedClicks / duel.sequence.length) * 100);
}

function consumesDuelEvent(duel: ActiveDuel, userId: string, nowMs: number) {
  const bucket = duel.eventBuckets.get(userId);
  if (!bucket || nowMs - bucket.windowStartedAtMs >= 1000) {
    duel.eventBuckets.set(userId, { windowStartedAtMs: nowMs, count: 1 });
    return true;
  }

  if (bucket.count >= DUEL_MAX_EVENTS_PER_SECOND) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function registerDuelHandlers(
  io: Server,
  { jwtSecret, prisma, logger = console, now = Date.now }: RegisterDuelHandlersOptions,
  state: DuelRuntimeState = createDuelState(),
) {
  io.use(async (socket, next) => {
    const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : null;
    if (!token) return next(new Error('Unauthorized'));

    try {
      const decoded = jwt.verify(token, jwtSecret) as { id?: string };
      if (!decoded.id) return next(new Error('Unauthorized'));

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          pseudonym: true,
          brainId: true,
          rating: true,
          role: true,
        },
      });

      if (!user) return next(new Error('Unauthorized'));
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  async function resolveDuel(roomId: string, winnerId: string, loserId: string) {
    const duel = state.activeDuels.get(roomId);
    if (!duel || duel.isFinished) return;

    duel.isFinished = true;
    logger.log(`[Duel] Resolving match ${roomId}: Winner=${winnerId}`);

    const winner = await prisma.user.findUnique({ where: { id: winnerId } });
    const loser = await prisma.user.findUnique({ where: { id: loserId } });

    if (winner && loser) {
      const kFactor = 32;
      const expectedWinner = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
      const expectedLoser = 1 / (1 + Math.pow(10, (winner.rating - loser.rating) / 400));

      const winnerGain = Math.round(kFactor * (1 - expectedWinner));
      const loserLoss = Math.round(kFactor * (0 - expectedLoser));

      await prisma.$transaction([
        prisma.user.update({
          where: { id: winnerId },
          data: {
            rating: winner.rating + winnerGain,
            experience: { increment: 25 },
          },
        }),
        prisma.user.update({
          where: { id: loserId },
          data: {
            rating: Math.max(100, loser.rating + loserLoss),
            experience: { increment: 5 },
          },
        }),
      ]);

      logger.log(`[Duel] Rating updated: ${winner.pseudonym} (+${winnerGain}), ${loser.pseudonym} (${loserLoss})`);
    }

    const winnerIndex = participantIndex(duel, winnerId);
    const loserIndex = participantIndex(duel, loserId);
    if (winnerIndex !== -1) {
      io.to(duel.players[winnerIndex]).emit('duel:result', {
        roomId,
        result: 'win',
        winnerId,
        loserId,
      });
    }
    if (loserIndex !== -1) {
      io.to(duel.players[loserIndex]).emit('duel:result', {
        roomId,
        result: 'loss',
        winnerId,
        loserId,
      });
    }

    state.activeDuels.delete(roomId);
  }

  io.on('connection', (socket) => {
    const connectedUser = getSocketUser(socket);
    logger.log(`[Socket] Client connected: ${socket.id} user=${connectedUser.id}`);

    socket.on('duel:matchmake', () => {
      const user = getSocketUser(socket);
      const userId = user.id;
      const rating = Number.isFinite(user.rating) ? Number(user.rating) : 1000;
      const name = displayNameFor(user);
      logger.log(`[Matchmaking] User ${name} (${rating}) joined queue`);

      state.matchmakingQueue = state.matchmakingQueue.filter((queuedUser) => (
        queuedUser.userId !== userId && queuedUser.socketId !== socket.id
      ));

      const opponentIndex = state.matchmakingQueue.findIndex((queuedUser) => Math.abs(queuedUser.rating - rating) <= 400);

      if (opponentIndex !== -1) {
        const opponent = state.matchmakingQueue.splice(opponentIndex, 1)[0];
        const roomId = `duel_${userId}_${opponent.userId}_${Date.now()}`;

        logger.log(`[Matchmaking] Match found: ${name} vs ${opponent.name}`);

        io.to(socket.id).emit('duel:matched', {
          roomId,
          opponent: { id: opponent.userId, name: opponent.name, rating: opponent.rating },
        });
        io.to(opponent.socketId).emit('duel:matched', {
          roomId,
          opponent: { id: userId, name, rating },
        });

        state.activeDuels.set(roomId, {
          players: [socket.id, opponent.socketId],
          userIds: [userId, opponent.userId],
          ratings: [rating, opponent.rating],
          progress: new Map([[userId, 0], [opponent.userId, 0]]),
          acceptedClicks: new Map([[userId, 0], [opponent.userId, 0]]),
          joinedUserIds: new Set(),
          firstClickAtMs: new Map(),
          eventBuckets: new Map(),
          sequence: generateExpectedSequence(DUEL_SIZE, DUEL_MODE),
          isFinished: false,
        });
      } else {
        state.matchmakingQueue.push({ socketId: socket.id, userId, rating, name });
      }
    });

    socket.on('duel:leave-queue', () => {
      const userId = getSocketUser(socket).id;
      state.matchmakingQueue = state.matchmakingQueue.filter((queuedUser) => queuedUser.userId !== userId);
      logger.log(`[Matchmaking] User ${userId} left queue`);
    });

    socket.on('duel:join', (data) => {
      const roomId = typeof data?.roomId === 'string' ? data.roomId : '';
      const userId = getSocketUser(socket).id;
      const duel = state.activeDuels.get(roomId);

      if (!duel || !duel.players.includes(socket.id) || !duel.userIds.includes(userId)) {
        socket.emit('duel:error', { error: 'Room access denied' });
        return;
      }

      duel.joinedUserIds.add(userId);
      socket.join(roomId);
      logger.log(`[Socket] User ${userId} joined room ${roomId}`);
      socket.to(roomId).emit('duel:opponent-joined', { userId });
    });

    socket.on('duel:progress', async (data) => {
      const roomId = typeof data?.roomId === 'string' ? data.roomId : '';
      const userId = getSocketUser(socket).id;
      const rawProgress = data?.progress;
      const duel = state.activeDuels.get(roomId);

      if (!duel || duel.isFinished || !duel.players.includes(socket.id) || !duel.userIds.includes(userId) || !duel.joinedUserIds.has(userId)) {
        socket.emit('duel:error', { error: 'Room access denied' });
        return;
      }

      if (typeof rawProgress !== 'number' || !Number.isFinite(rawProgress)) {
        socket.emit('duel:error', { error: 'Invalid progress' });
        return;
      }

      if (!consumesDuelEvent(duel, userId, now())) {
        socket.emit('duel:error', { error: 'Rate limit exceeded' });
        return;
      }

      const progress = verifiedProgressFor(duel, userId);
      duel.progress.set(userId, progress);
      socket.to(roomId).emit('duel:opponent-progress', { progress });
    });

    socket.on('duel:cell-click', async (data) => {
      const roomId = typeof data?.roomId === 'string' ? data.roomId : '';
      const userId = getSocketUser(socket).id;
      const duel = state.activeDuels.get(roomId);

      if (!duel || duel.isFinished || !duel.players.includes(socket.id) || !duel.userIds.includes(userId) || !duel.joinedUserIds.has(userId)) {
        socket.emit('duel:error', { error: 'Room access denied' });
        return;
      }

      const nowMs = now();
      if (!consumesDuelEvent(duel, userId, nowMs)) {
        socket.emit('duel:error', { error: 'Rate limit exceeded' });
        return;
      }

      const cell = data?.cell;
      const num = typeof cell?.num === 'number' && Number.isFinite(cell.num) ? cell.num : null;
      const color = cell?.color === 'red' || cell?.color === 'black' ? cell.color : 'black';
      const acceptedClicks = duel.acceptedClicks.get(userId) || 0;
      const expected = duel.sequence[acceptedClicks];

      if (!expected || num !== expected.num || color !== expected.color) {
        socket.emit('duel:error', { error: 'Invalid duel evidence' });
        return;
      }

      const firstClickAtMs = duel.firstClickAtMs.get(userId) ?? nowMs;
      const nextAcceptedClicks = acceptedClicks + 1;
      if (nextAcceptedClicks >= duel.sequence.length && nowMs - firstClickAtMs < DUEL_MIN_FINISH_MS) {
        socket.emit('duel:error', { error: 'Completion too fast' });
        return;
      }

      duel.firstClickAtMs.set(userId, firstClickAtMs);
      duel.acceptedClicks.set(userId, nextAcceptedClicks);

      const progress = verifiedProgressFor(duel, userId);
      duel.progress.set(userId, progress);
      socket.to(roomId).emit('duel:opponent-progress', { progress });

      if (progress >= 100) {
        const opponentId = duel.userIds.find((id) => id !== userId);
        if (!opponentId) return;

        await resolveDuel(roomId, userId, opponentId);
      }
    });

    socket.on('disconnect', () => {
      const userId = socket.data.user?.id;
      state.matchmakingQueue = state.matchmakingQueue.filter((queuedUser) => (
        queuedUser.socketId !== socket.id && queuedUser.userId !== userId
      ));

      for (const [roomId, duel] of state.activeDuels.entries()) {
        if (duel.players.includes(socket.id) && !duel.isFinished) {
          logger.log(`[Duel] User disconnected from room ${roomId}. Aborting.`);
          state.activeDuels.delete(roomId);
        }
      }

      logger.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return state;
}
