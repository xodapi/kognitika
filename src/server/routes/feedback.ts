import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import prisma from '../../lib/prisma.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import { eventBus } from '../events/event-bus.ts';
import { authenticate } from '../middleware/auth.ts';
import { feedbackSubmitSchema } from '../schemas/feedback.ts';

const router = Router();
const logger = createSafeLogger('feedback-route');

function generateTrackingNum() {
  return `FB-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function isUniqueTrackingCollision(error: unknown) {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002';
}

router.post('/', authenticate, async (req: any, res) => {
  const parsed = feedbackSubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid feedback payload' });
  }

  const { type, content, rating } = parsed.data;

  try {
    let createdFeedback: { trackingNum: string } | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const trackingNum = generateTrackingNum();

      try {
        createdFeedback = await prisma.feedback.create({
          data: {
            userId: req.user.id,
            type,
            content,
            trackingNum,
          },
          select: {
            trackingNum: true,
          },
        });
        break;
      } catch (error) {
        if (isUniqueTrackingCollision(error)) continue;
        throw error;
      }
    }

    if (!createdFeedback) {
      return res.status(503).json({ error: 'Failed to allocate feedback tracking number' });
    }

    logger.info('Feedback persisted', { type, rating: rating ?? 'n/a' });

    eventBus.emit('feedback:submitted', {
      userId: req.user.id,
      trackingNum: createdFeedback.trackingNum,
      type,
      content,
    });

    res.status(201).json({ success: true, trackingNum: createdFeedback.trackingNum });
  } catch (error) {
    logger.error('Feedback save failed', { error: safeError(error), type });
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

export default router;
