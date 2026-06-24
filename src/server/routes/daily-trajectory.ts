import { Router } from 'express';
import { authenticate } from '../middleware/auth.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import {
  getOrCreateDailyPlan,
  updateItemStatus,
  computeProgress,
} from '../services/daily-trajectory.ts';
import { DailyPracticeItemStatusSchema } from '../../lib/daily-practice-types.ts';

const router = Router();
const logger = createSafeLogger('daily-trajectory-route');

/**
 * GET /api/daily-trajectory — get or create today's plan
 * Query: date (optional, YYYY-MM-DD)
 */
router.get('/', authenticate, async (req: any, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();

    const items = await getOrCreateDailyPlan(req.user.id, targetDate);
    const progress = computeProgress(items);

    res.json({ items, progress, date: targetDate.toISOString().slice(0, 10) });
  } catch (err) {
    logger.error('Failed to get daily trajectory', { error: safeError(err) });
    res.status(500).json({ error: 'Failed to get daily trajectory' });
  }
});

/**
 * POST /api/daily-trajectory/generate — force regenerate plan for a date
 * Body: { date?: string }
 */
router.post('/generate', authenticate, async (req: any, res) => {
  try {
    const { date } = req.body || {};
    const targetDate = date ? new Date(date) : new Date();

    const items = await getOrCreateDailyPlan(req.user.id, targetDate);
    const progress = computeProgress(items);

    res.json({ items, progress, date: targetDate.toISOString().slice(0, 10) });
  } catch (err) {
    logger.error('Failed to generate daily trajectory', { error: safeError(err) });
    res.status(500).json({ error: 'Failed to generate daily trajectory' });
  }
});

/**
 * PATCH /api/daily-trajectory/item — update item status
 * Body: { itemId: string, status: 'planned' | 'in_progress' | 'completed' | 'skipped', date?: string }
 */
router.patch('/item', authenticate, async (req: any, res) => {
  try {
    const { itemId, status, date } = req.body;

    if (!itemId || !status) {
      return res.status(400).json({ error: 'itemId and status are required' });
    }

    const parsed = DailyPracticeItemStatusSchema.safeParse(status);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const targetDate = date ? new Date(date) : new Date();
    const updated = await updateItemStatus(req.user.id, itemId, parsed.data, targetDate);

    if (!updated) {
      return res.status(404).json({ error: 'Daily plan not found' });
    }

    const progress = computeProgress(updated);
    res.json({ items: updated, progress });
  } catch (err) {
    logger.error('Failed to update item status', { error: safeError(err) });
    res.status(500).json({ error: 'Failed to update item status' });
  }
});

export default router;
