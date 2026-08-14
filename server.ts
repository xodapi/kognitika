import './src/lib/env.ts';
import './src/lib/zod-config.ts';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { execSync } from 'child_process';
import prisma from './src/lib/prisma.ts';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createSafeLogger } from './src/lib/safe-logger.ts';
import { createExpressCorsOptions, createSocketCorsOptions, resolveCorsConfig } from './src/server/config/cors.ts';
import { validateJwtSecret } from './src/server/config/runtime-security.ts';
import { resolveListenHost, resolveTrustProxy } from './src/server/config/proxy.ts';
import { startAnalyticsOutboxWorker } from './src/server/services/analytics-outbox-worker.ts';

const logger = createSafeLogger('server');

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

const investorLeadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много заявок. Попробуйте позже или напишите нам в Telegram.' },
});

// Register subscribers
import './src/lib/subscribers.ts';
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
import feedbackRoutes from './src/server/routes/feedback.ts';
import practiceFlowRoutes from './src/server/routes/practice-flow.ts';
import dailyTrajectoryRoutes from './src/server/routes/daily-trajectory.ts';
import neurotrainerRoutes from './src/server/routes/neurotrainer.ts';
import investorLeadRoutes from './src/server/routes/investor-leads.ts';
import { authenticate } from './src/server/middleware/auth.ts';
import { apiErrorHandler, apiNotFound } from './src/server/middleware/api-errors.ts';
import { privacyGuard } from './src/server/middleware/privacy.ts';

import { Server } from 'socket.io';
import { registerDuelHandlers } from './src/server/realtime/duels.ts';
import { getDuelRepository } from './src/server/infrastructure/container.ts';

const PORT = Number(process.env.PORT) || 3006;
const SERVER_SHUTDOWN_GRACE_MS = 10_000;

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
let JWT_SECRET: string;
try {
  JWT_SECRET = validateJwtSecret(process.env.JWT_SECRET);
} catch (error) {
  logger.error('Invalid runtime security configuration', { error });
  process.exit(1);
}
const corsConfig = resolveCorsConfig(process.env);
if (corsConfig.warning) {
  logger.warn('CORS configuration warning', { reason: corsConfig.warning });
}

async function startServer() {
  const analyticsOutboxWorker = startAnalyticsOutboxWorker();
  const app = express();
  app.set('trust proxy', resolveTrustProxy(process.env));
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: createSocketCorsOptions(corsConfig),
    maxHttpBufferSize: 16 * 1024,
    perMessageDeflate: false,
  });

  registerDuelHandlers(io, { repository: getDuelRepository(), jwtSecret: JWT_SECRET });

  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV !== 'production' 
      ? {
          directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'connect-src': ["'self'", 'ws:', 'wss:'],
            'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          },
        }
      : undefined,
  }));
  app.use(cors(createExpressCorsOptions(corsConfig)));
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
  app.use('/api/analytics/practice-flow', apiLimiter, practiceFlowRoutes);
  app.use('/api/analytics', apiLimiter, analyticsRoutes);
  app.use('/api/dashboard', apiLimiter, dashboardRoutes);
  app.use('/api/client-error', apiLimiter, observabilityRoutes);
  app.use('/api/ideas', apiLimiter, ideasRoutes);
  app.use('/api/feedback', apiLimiter, feedbackRoutes);
  app.use('/api/daily-trajectory', apiLimiter, dailyTrajectoryRoutes);
  app.use('/api/neurotrainer', apiLimiter, neurotrainerRoutes);
  app.use('/api/investor-leads', investorLeadLimiter, investorLeadRoutes);

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

  // API failures must never fall through to the SPA fallback. This keeps API
  // clients on a stable JSON contract in both development and production.
  app.use('/api', apiNotFound);
  app.use(apiErrorHandler);

  // ── Vite Middleware / Static ─────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    // Vite is development-only. Keeping the dynamic import out of the
    // production module graph lets the runtime image omit Vite safely.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    // SPA fallback for client-side routes - BEFORE vite.middlewares
    // But skip API, Vite internals, AND static files with extensions
    app.get('*', async (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      // Skip Vite internal routes
      if (req.path.startsWith('/@vite') || req.path.startsWith('/@react-refresh') || req.path.startsWith('/@fs')) {
        return next();
      }
      // Skip static files (have extensions like .js, .css, .png, .ico, .map, .html, .json, .txt, .svg, .woff, .woff2, .ttf, .eot)
      if (/\.(js|css|png|ico|map|html|json|txt|svg|woff|woff2|ttf|eot|js\.map|css\.map)$/i.test(req.path)) {
        return next();
      }
      // Skip known asset paths
      if (req.path.startsWith('/assets/') || req.path.startsWith('/public/')) {
        return next();
      }
      try {
        const indexPath = path.join(process.cwd(), 'index.html');
        let template = await import('fs/promises').then(fs => fs.readFile(indexPath, 'utf-8'));
        template = await vite.transformIndexHtml(req.url, template);
        res.setHeader('Content-Type', 'text/html');
        res.send(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
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

  const listenHost = resolveListenHost(process.env);
  let shutdownPromise: Promise<void> | null = null;
  const shutdown = () => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      logger.info('Server shutdown started');
      io.close();
      const cleanup = Promise.allSettled([
        analyticsOutboxWorker?.stop(),
        prisma.$disconnect(),
      ]);
      let graceTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        const completed = await Promise.race([
          cleanup.then(() => true),
          new Promise<boolean>(resolve => {
            graceTimer = setTimeout(() => resolve(false), SERVER_SHUTDOWN_GRACE_MS);
            graceTimer.unref?.();
          }),
        ]);
        logger[completed ? 'info' : 'warn'](
          completed ? 'Server shutdown complete' : 'Server shutdown grace window elapsed',
        );
      } finally {
        if (graceTimer) clearTimeout(graceTimer);
      }
    })();
    return shutdownPromise;
  };
  httpServer.once('close', () => void shutdown());
  process.once('SIGTERM', () => {
    if (httpServer.listening) httpServer.close();
    void shutdown();
  });
  process.once('SIGINT', () => {
    if (httpServer.listening) httpServer.close();
    void shutdown();
  });
  httpServer.listen(PORT, listenHost, () => {
    logger.info('Server running', { host: listenHost, port: PORT, buildId: BUILD_ID });
  });
}

startServer();
