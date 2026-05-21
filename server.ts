import './src/lib/env.ts';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import prisma from './src/lib/prisma.ts';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login/register attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again after an hour.' }
});

// Register subscribers & EventBus
import { eventBus } from './src/lib/event-bus.ts';
import './src/lib/subscribers.ts';
import './src/lib/report-subscriber.ts';
import './src/lib/observability-subscriber.ts';

import authRoutes from './src/server/routes/auth.ts';
import gameRoutes from './src/server/routes/game.ts';
import adminRoutes from './src/server/routes/admin.ts';
import chatRoutes from './src/server/routes/chat.ts';
import leaderboardRoutes from './src/server/routes/leaderboard.ts';
import analyticsRoutes from './src/server/routes/analytics.ts';
import { authenticate } from './src/server/middleware/auth.ts';
import { privacyGuard } from './src/server/middleware/privacy.ts';

import { Server } from 'socket.io';

interface MatchmakingUser {
  socketId: string;
  userId: string;
  rating: number;
  name: string;
}

let matchmakingQueue: MatchmakingUser[] = [];
const activeDuels = new Map<string, {
  players: string[]; // [socketId1, socketId2]
  userIds: string[]; // [userId1, userId2]
  ratings: number[]; // [rating1, rating2]
  progress: Map<string, number>;
  isFinished: boolean;
}>();

const PORT = Number(process.env.PORT) || 3006;

// Startup Guard
if (!process.env.JWT_SECRET) {
  console.error('\x1b[31m[FATAL] JWT_SECRET is not defined in .env\x1b[0m');
  process.exit(1);
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.io Logic
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('duel:matchmake', (data) => {
      const { userId, rating, name } = data;
      console.log(`[Matchmaking] User ${name} (${rating}) joined queue`);
      
      // Check if already in queue
      matchmakingQueue = matchmakingQueue.filter(u => u.userId !== userId);
      
      // Try to find a match
      const opponentIndex = matchmakingQueue.findIndex(u => Math.abs(u.rating - rating) <= 400);
      
      if (opponentIndex !== -1) {
        const opponent = matchmakingQueue.splice(opponentIndex, 1)[0];
        const roomId = `duel_${userId}_${opponent.userId}_${Date.now()}`;
        
        console.log(`[Matchmaking] Match found: ${name} vs ${opponent.name}`);
        
        // Notify both
        io.to(socket.id).emit('duel:matched', { roomId, opponent: { id: opponent.userId, name: opponent.name, rating: opponent.rating } });
        io.to(opponent.socketId).emit('duel:matched', { roomId, opponent: { id: userId, name, rating } });

        // Initialize duel state
        activeDuels.set(roomId, {
          players: [socket.id, opponent.socketId],
          userIds: [userId, opponent.userId],
          ratings: [rating, opponent.rating],
          progress: new Map([[userId, 0], [opponent.userId, 0]]),
          isFinished: false
        });
      } else {
        matchmakingQueue.push({ socketId: socket.id, userId, rating, name });
      }
    });

    socket.on('duel:leave-queue', (data) => {
      const { userId } = data;
      matchmakingQueue = matchmakingQueue.filter(u => u.userId !== userId);
      console.log(`[Matchmaking] User ${userId} left queue`);
    });

    socket.on('duel:join', (data) => {
// ...
      const { roomId, userId } = data;
      socket.join(roomId);
      console.log(`[Socket] User ${userId} joined room ${roomId}`);
      socket.to(roomId).emit('duel:opponent-joined', { userId });
    });

    socket.on('duel:progress', async (data) => {
      const { roomId, progress, userId } = data;
      socket.to(roomId).emit('duel:opponent-progress', { progress });

      const duel = activeDuels.get(roomId);
      if (duel && !duel.isFinished) {
        duel.progress.set(userId, progress);

        if (progress >= 100) {
          duel.isFinished = true;
          const opponentId = duel.userIds.find(id => id !== userId)!;
          
          // Determine winner
          await resolveDuel(roomId, userId, opponentId);
        }
      }
    });

    socket.on('disconnect', () => {
      matchmakingQueue = matchmakingQueue.filter(u => u.socketId !== socket.id);
      
      // Cleanup active duels if someone leaves prematurely
      for (const [roomId, duel] of activeDuels.entries()) {
        if (duel.players.includes(socket.id) && !duel.isFinished) {
          console.log(`[Duel] User disconnected from room ${roomId}. Aborting.`);
          // In a real app, maybe award a win to the other player
          activeDuels.delete(roomId);
        }
      }

      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  async function resolveDuel(roomId: string, winnerId: string, loserId: string) {
    const duel = activeDuels.get(roomId);
    if (!duel) return;

    console.log(`[Duel] Resolving match ${roomId}: Winner=${winnerId}`);

    const winner = await prisma.user.findUnique({ where: { id: winnerId } });
    const loser = await prisma.user.findUnique({ where: { id: loserId } });

    if (winner && loser) {
      // Elo calculation
      const K = 32;
      const expectedWinner = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
      const expectedLoser = 1 / (1 + Math.pow(10, (winner.rating - loser.rating) / 400));

      const winnerGain = Math.round(K * (1 - expectedWinner));
      const loserLoss = Math.round(K * (0 - expectedLoser));

      await prisma.$transaction([
        prisma.user.update({
          where: { id: winnerId },
          data: { 
            rating: winner.rating + winnerGain,
            experience: { increment: 25 }
          }
        }),
        prisma.user.update({
          where: { id: loserId },
          data: { 
            rating: Math.max(100, loser.rating + loserLoss),
            experience: { increment: 5 }
          }
        })
      ]);

      console.log(`[Duel] Rating updated: ${winner.pseudonym} (+${winnerGain}), ${loser.pseudonym} (${loserLoss})`);
    }

    activeDuels.delete(roomId);
  }

  app.use(cors());
  app.use(express.json());

  // Privacy Guard (Anonymization) - ДОЛЖЕН БЫТЬ ПЕРЕД РОУТАМИ
  app.use(privacyGuard);

  // ── Modular Routes ──────────────────────────────────────
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/game', apiLimiter, gameRoutes);
  app.use('/api/admin', authenticate, adminRoutes);
  app.use('/api/chat', apiLimiter, chatRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/analytics', apiLimiter, analyticsRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/me', authenticate, async (req: any, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  app.get('/api/progress', (req, res) => res.redirect('/api/game/progress'));

  app.post('/api/feedback', authenticate, async (req: any, res) => {
    try {
      const { type, content, rating } = req.body;
      const userIdentifier = req.user.email || `Brain[${req.user.brainId || req.user.id.slice(0, 8)}]`;
      const trackingNum = `FB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      console.log(`[Feedback] type=${type} rating=${rating ?? 'n/a'}`);
      
      // Note: In a real app, we would save this to the database
      res.json({ success: true, trackingNum });
    } catch {
      res.status(500).json({ error: 'Failed to save feedback' });
    }
  });

  // ── Vite Middleware / Static ─────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Disable caching for Service Worker itself
    app.use((req, res, next) => {
      if (req.path === '/sw.js') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Content-Type', 'application/javascript');
      }
      next();
    });
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\x1b[32m[Kognitika] Server running on http://localhost:${PORT}\x1b[0m`);
  });
}

startServer();
