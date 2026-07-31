/**
 * Shared test app builder for integration tests.
 *
 * Mounts the real production route modules (auth, chat SSE, game, analytics,
 * etc.) on an Express app with the same middleware ordering as `server.ts`.
 * `prisma` is swapped by the importing test file via `vi.mock('../lib/prisma.ts')`,
 * following the repo's established route-test pattern.
 */
import express, { type Express } from 'express';
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { rateLimit } from 'express-rate-limit';

export const JWT_SECRET = 'test-secret-key-for-integration-tests-32-chars-minimum!!';

let sharedApp: {
  app: Express;
  server: Server;
  baseUrl: string;
  jwtSecret: string;
  cleanup: () => Promise<void>;
} | null = null;

export async function getSharedTestApp() {
  if (sharedApp) return sharedApp;

  process.env.JWT_SECRET = JWT_SECRET;
  process.env.NODE_ENV = 'test';
  process.env.TRUST_PROXY = 'loopback';
  process.env.LISTEN_HOST = '127.0.0.1';
  process.env.SSE_MAX_CONNECTIONS = '100';
  process.env.SSE_MAX_CONNECTIONS_PER_ADDRESS = '10';

  const app = express();
  app.use(express.json());

  const { default: authRoutes } = await import('../server/routes/auth.ts');
  const { default: chatRoutes } = await import('../server/routes/chat.ts');
  const { default: gameRoutes } = await import('../server/routes/game.ts');
  const { default: analyticsRoutes } = await import('../server/routes/analytics.ts');
  const { default: leaderboardRoutes } = await import('../server/routes/leaderboard.ts');
  const { default: dashboardRoutes } = await import('../server/routes/dashboard.ts');
  const { default: practiceFlowRoutes } = await import('../server/routes/practice-flow.ts');
  const { default: dailyTrajectoryRoutes } = await import('../server/routes/daily-trajectory.ts');
  const { default: neurotrainerRoutes } = await import('../server/routes/neurotrainer.ts');
  const { default: ideasRoutes } = await import('../server/routes/ideas.ts');
  const { default: feedbackRoutes } = await import('../server/routes/feedback.ts');
  const { default: adminRoutes } = await import('../server/routes/admin.ts');
  const { default: observabilityRoutes } = await import('../server/routes/observability.ts');
  const { authenticate } = await import('../server/middleware/auth.ts');
  const { privacyGuard } = await import('../server/middleware/privacy.ts');

  app.use((_req, res, next) => {
    res.setHeader('X-Build-Id', 'test');
    next();
  });
  app.use(privacyGuard);

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

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

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), buildId: 'test' });
  });

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  sharedApp = {
    app,
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    jwtSecret: JWT_SECRET,
    cleanup: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      sharedApp = null;
    },
  };

  return sharedApp;
}
