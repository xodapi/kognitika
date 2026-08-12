import { Router } from 'express';
import { z } from 'zod';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import { authenticate, isAdmin } from '../middleware/auth.ts';
import { validateQuery } from '../middleware/validate.ts';
import { getLeaderboardQueryRepository } from '../infrastructure/container.ts';

const router = Router();
const leaderboardQuerySchema = z.object({
  period: z.enum(['weekly']).optional(),
}).strict();
const logger = createSafeLogger('leaderboard-route');

/**
 * GET /leaderboard
 * Возвращает топ игроков для публичного рейтинга.
 * Использует только псевдонимы для обеспечения анонимности.
 */
router.get('/', validateQuery(leaderboardQuerySchema), async (req, res) => {
  const { period } = req.validated!.query;

  try {
    if (period === 'weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const weeklyTop = await getLeaderboardQueryRepository().findWeekly(sevenDaysAgo, 50);
      const result = weeklyTop.map((user) => ({
        ...user,
        name: user.pseudonym || 'Аноним',
      }));

      return res.json(result);
    }

    // Default: Global All-time Leaderboard
    const topUsers = await getLeaderboardQueryRepository().findGlobal(50);

    const result = topUsers.map(u => ({
      ...u,
      name: u.pseudonym
    }));

    res.json(result);
  } catch (error) {
    logger.error('Leaderboard fetch failed', { error: safeError(error), period });
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /leaderboard/sync
 * (Admin only) Принудительное обновление кэша рейтинга.
 */
router.post('/sync', authenticate, isAdmin, async (_req, res) => {
  // Логика синхронизации User -> LeaderboardEntry
  res.json({ message: 'Sync started' });
});

export default router;
