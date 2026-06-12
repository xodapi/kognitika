import './src/lib/env.ts';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { execSync } from 'child_process';
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
import dashboardRoutes from './src/server/routes/dashboard.ts';
import observabilityRoutes from './src/server/routes/observability.ts';
import ideasRoutes from './src/server/routes/ideas.ts';
import { authenticate } from './src/server/middleware/auth.ts';
import { privacyGuard } from './src/server/middleware/privacy.ts';

import { Server } from 'socket.io';
import { registerDuelHandlers } from './src/server/realtime/duels.ts';

const PORT = Number(process.env.PORT) || 3006;

function resolveBuildId() {
  if (process.env.BUILD_HASH) return process.env.BUILD_HASH;
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT;
  if (process.env.SOURCE_VERSION) return process.env.SOURCE_VERSION;

  try {
    return execSync('git rev-parse --short HEAD', { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

const BUILD_ID = resolveBuildId();

// Startup Guard
if (!process.env.JWT_SECRET) {
  console.error('\x1b[31m[FATAL] JWT_SECRET is not defined in .env\x1b[0m');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  registerDuelHandlers(io, { prisma, jwtSecret: JWT_SECRET });

  app.use(cors());
  app.use(express.json());
  app.use((_req, res, next) => {
    res.setHeader('X-Build-Id', BUILD_ID);
    next();
  });

  // Privacy Guard (Anonymization) - ДОЛЖЕН БЫТЬ ПЕРЕД РОУТАМИ
  app.use(privacyGuard);

  // ── Modular Routes ──────────────────────────────────────
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/game', apiLimiter, gameRoutes);
  app.use('/api/admin', authenticate, adminRoutes);
  app.use('/api/chat', apiLimiter, chatRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/analytics', apiLimiter, analyticsRoutes);
  app.use('/api/dashboard', apiLimiter, dashboardRoutes);
  app.use('/api/client-error', apiLimiter, observabilityRoutes);
  app.use('/api/ideas', apiLimiter, ideasRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), buildId: BUILD_ID });
  });

  app.get('/api/me', authenticate, async (req: any, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          brainId: true,
          pseudonym: true,
          level: true,
          experience: true,
          rating: true,
          role: true,
          streakDays: true,
        },
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      const displayName = user.pseudonym || user.name || `Brain ${user.id.slice(0, 8)}`;
      res.json({
        user: {
          ...user,
          name: displayName,
          email: null,
        },
      });
    } catch {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  app.get('/api/progress', (req, res) => res.redirect('/api/game/progress'));

  app.post('/api/feedback', authenticate, async (req: any, res) => {
    try {
      const { type, content, rating } = req.body;
      const trackingNum = `FB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      if (!['idea', 'bug', 'improvement', 'other'].includes(type) || typeof content !== 'string' || content.trim().length === 0 || content.length > 5000) {
        return res.status(400).json({ error: 'Invalid feedback payload' });
      }
      
      console.log(`[Feedback] type=${type} rating=${rating ?? 'n/a'}`);
      
      await prisma.feedback.create({
        data: {
          userId: req.user.id,
          type,
          content: content.trim(),
          trackingNum,
        },
      });

      const EventBusClass: any = eventBus.constructor;
      eventBus.emit(EventBusClass.EVENTS.FEEDBACK_SUBMITTED, {
        userId: req.user.id,
        trackingNum,
        type,
        content: content.trim(),
      });

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

    app.get('/sw.js', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.type('application/javascript');
      res.sendFile(path.join(distPath, 'sw.js'));
    });

    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      immutable: true,
      maxAge: '1y',
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }));

    app.use(express.static(distPath, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      },
    }));

    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`\x1b[32m[Kognitika] Server running on http://localhost:${PORT}\x1b[0m`);
  });
}

startServer();
