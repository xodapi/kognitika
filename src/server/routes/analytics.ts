import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.ts';
import { validateQuery } from '../middleware/validate.ts';
import jwt from 'jsonwebtoken';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import { getAnalyticsServices } from '../infrastructure/container.ts';
import { getAnalyticsSessionOwnershipRepository } from '../infrastructure/container.ts';
import { parseSessionAnalyticsJob } from '../../core/analyze-session/index.ts';

const router = Router();
const logger = createSafeLogger('analytics-route');

const gameTypeSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_]+$/).transform((value) => value.toUpperCase());
const compareQuerySchema = z.object({
  gameType: gameTypeSchema.optional().default('SCHULTE'),
  score: z.coerce.number().finite().min(0).max(1_000_000).default(0),
  timeMs: z.coerce.number().finite().int().min(0).max(24 * 60 * 60 * 1000).default(0),
  errors: z.coerce.number().finite().int().min(0).max(10_000).default(0),
}).strict();

const isoDateSchema = z.string().datetime({ offset: true });
const summariesQuerySchema = z.object({
  moduleId: z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/).optional(),
  category: z.enum(['cognitive', 'somatic', 'safety']).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
}).strict().refine(
  (value) => !value.from || !value.to || new Date(value.from) <= new Date(value.to),
  { message: 'from must be before or equal to to', path: ['from'] },
);

const trendQuerySchema = z.object({
  moduleId: z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/).optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
}).strict();

/**
 * GET /api/analytics/compare — compare current results with user history
 */
router.get('/compare', validateQuery(compareQuerySchema), async (req: any, res) => {
  try {
    const { gameType, score, timeMs, errors } = req.validated!.query;

    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        userId = decoded.id;
      } catch (err) {
        // Игнорируем ошибки верификации, продолжаем как гость
      }
    }

    const services = getAnalyticsServices();
    const result = await services.comparison.compare({
      gameType,
      score,
      timeMs,
      errors,
      userId,
    });

    res.json(result);
  } catch (error) {
    logger.error('Analytics compare failed', { error: safeError(error) });
    res.status(500).json({ error: 'Ошибка сравнения результатов' });
  }
});

/**
 * GET /api/analytics/profile — generate cognitive profile
 */
router.get('/profile', authenticate, async (req: any, res) => {
  try {
    const services = getAnalyticsServices();
    const profile = await services.profile.getUserProfile(req.user.id);

    if (!profile.profileReady) {
      return res.json({
        profile: null,
        completedSessions: profile.completedSessions,
        requiredSessions: 5,
        remainingSessions: Math.max(0, 5 - profile.completedSessions),
        message: 'Профиль станет точнее после нескольких завершенных тренировок',
      });
    }

    res.json({
      completedSessions: profile.completedSessions,
      uniqueGamesPlayed: profile.uniqueGamesPlayed,
      totalPlayTimeMinutes: profile.totalPlayTimeMinutes,
      requiredSessions: 5,
      remainingSessions: 0,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Analytics profile failed', { error: safeError(error) });
    res.status(500).json({ error: 'Ошибка генерации профиля' });
  }
});

/**
 * GET /api/analytics/export — export user data in LLM-friendly format
 */
router.get('/export', authenticate, async (req: any, res) => {
  try {
    const services = getAnalyticsServices();
    const exportData = await services.export.exportUserData(req.user.id);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=kognitika_export_${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    logger.error('Analytics export failed', { error: safeError(error) });
    res.status(500).json({ error: 'Ошибка экспорта данных' });
  }
});

/**
 * POST /api/analytics/summaries — persist a SessionAnalyticsSummaryRecord
 */
router.post('/summaries', authenticate, async (req: any, res) => {
  try {
    const parsed = parseSessionAnalyticsJob(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid session analytics job',
        details: String(parsed.error),
      });
    }

    if (!await getAnalyticsSessionOwnershipRepository().isOwnedBy(
      parsed.data.session.sessionId,
      req.user.id,
    )) {
      return res.status(403).json({ error: 'Session does not belong to authenticated user' });
    }

    const services = getAnalyticsServices();
    await services.summaryPersistence.persistSummary({
      userId: req.user.id,
      sessionId: parsed.data.session.sessionId,
      job: req.body,
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    logger.error('Failed to persist analytics summary', { error: safeError(err) });
    res.status(500).json({ error: 'Failed to persist analytics summary' });
  }
});

/**
 * GET /api/analytics/summaries — query persisted summaries
 * Query params: moduleId, category, from, to, limit
 */
router.get('/summaries', authenticate, validateQuery(summariesQuerySchema), async (req: any, res) => {
  try {
    const { moduleId, category, from, to, limit } = req.validated!.query;

    const services = getAnalyticsServices();
    const summaries = await services.summaryQuery.getSummaries({
      userId: req.user.id,
      moduleId,
      category,
      from,
      to,
      limit,
    });

    res.json({ summaries });
  } catch (err) {
    logger.error('Failed to query analytics summaries', { error: safeError(err) });
    res.status(500).json({ error: 'Failed to query analytics summaries' });
  }
});

/**
 * GET /api/analytics/summaries/trend — trend-ready aggregated data
 * Query params: moduleId (optional), days (default 30)
 */
router.get('/summaries/trend', authenticate, validateQuery(trendQuerySchema), async (req: any, res) => {
  try {
    const { moduleId, days } = req.validated!.query;

    const services = getAnalyticsServices();
    const trend = await services.summaryQuery.getTrend({
      userId: req.user.id,
      moduleId,
      days,
    });

    res.json({ trend, days, moduleId: moduleId || null });
  } catch (err) {
    logger.error('Failed to compute trend data', { error: safeError(err) });
    res.status(500).json({ error: 'Failed to compute trend data' });
  }
});

/**
 * GET /api/analytics/cognitive-trend — full CognitiveTrend with direction detection
 * Query params: moduleId (optional), days (default 30)
 */
router.get('/cognitive-trend', authenticate, validateQuery(trendQuerySchema), async (req: any, res) => {
  try {
    const { moduleId, days } = req.validated!.query;

    const services = getAnalyticsServices();
    const trend = await services.cognitiveTrend.getCognitiveTrend({
      userId: req.user.id,
      moduleId,
      days,
    });

    res.json(trend);
  } catch (err) {
    logger.error('Failed to compute cognitive trend', { error: safeError(err) });
    res.status(500).json({ error: 'Failed to compute cognitive trend' });
  }
});

export default router;
