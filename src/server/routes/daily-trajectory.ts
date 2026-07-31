import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.ts';
import { validateBody, validateQuery } from '../middleware/validate.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import {
  getOrCreateDailyPlan,
  updateItemStatus,
  computeProgress,
} from '../services/daily-trajectory.ts';
import { DailyPracticeItemStatusSchema } from '../../lib/daily-practice-types.ts';

const router = Router();
const logger = createSafeLogger('daily-trajectory-route');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD').refine(
  (value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  },
  'Date must be valid',
);
const dateQuerySchema = z.object({ date: dateSchema.optional() }).strict();
const generatePlanSchema = z.object({ date: dateSchema.optional() }).strict();
const updateItemSchema = z.object({
  itemId: z.string().trim().min(1).max(40),
  status: DailyPracticeItemStatusSchema,
  date: dateSchema.optional(),
}).strict();

function parseTargetDate(date?: string) {
  return date ? new Date(`${date}T00:00:00.000Z`) : new Date();
}

/**
 * GET /api/daily-trajectory — get or create today's plan
 * Query: date (optional, YYYY-MM-DD)
 */
router.get('/', authenticate, validateQuery(dateQuerySchema), async (req: any, res) => {
  try {
    const { date } = req.validated!.query;
    const targetDate = parseTargetDate(date);

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
router.post('/generate', authenticate, validateBody(generatePlanSchema), async (req: any, res) => {
  try {
    const { date } = req.validated!.body;
    const targetDate = parseTargetDate(date);

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
router.patch('/item', authenticate, validateBody(updateItemSchema), async (req: any, res) => {
  try {
    const { itemId, status, date } = req.validated!.body;
    const targetDate = parseTargetDate(date);
    const updated = await updateItemStatus(req.user.id, itemId, status, targetDate);

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
