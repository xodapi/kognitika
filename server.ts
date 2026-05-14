import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import dotenv from 'dotenv';

// Load env before other imports
dotenv.config();

// Register subscribers & EventBus
import { eventBus } from './src/lib/event-bus.ts';
import './src/lib/subscribers.ts';
import './src/lib/report-subscriber.ts';
import './src/lib/observability-subscriber.ts';

// Import Modular Routes & Middleware
import authRoutes from './src/server/routes/auth.ts';
import gameRoutes from './src/server/routes/game.ts';
import adminRoutes from './src/server/routes/admin.ts';
import chatRoutes from './src/server/routes/chat.ts';
import leaderboardRoutes from './src/server/routes/leaderboard.ts';
import { authenticate } from './src/server/middleware/auth.ts';
import { privacyGuard } from './src/server/middleware/privacy.ts';

const PORT = Number(process.env.PORT) || 3006;

// Startup Guard
if (!process.env.JWT_SECRET) {
  console.error('\x1b[31m[FATAL] JWT_SECRET is not defined in .env\x1b[0m');
  process.exit(1);
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  app.use(cors());
  app.use(express.json());

  // Privacy Guard (Anonymization) - ДОЛЖЕН БЫТЬ ПЕРЕД РОУТАМИ
  app.use(privacyGuard);

  // ── Modular Routes ──────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/game', gameRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);

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
      
      console.log(`[Feedback] from ${userIdentifier} (${type}): ${content} ${rating ? `(Rating: ${rating})` : ''}`);
      
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
