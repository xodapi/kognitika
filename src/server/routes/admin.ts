import { Router } from 'express';
import { z } from 'zod';
import { authenticate, isAdmin } from '../middleware/auth.ts';
import { validateBody, validateParams } from '../middleware/validate.ts';
import { sanitizeAdminUserIdentity, sanitizePublicUserIdentity } from '../utils/privacy.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import { handleValidationError } from '../utils/validation.ts';
import { feedbackResponseSchema } from '../schemas/feedback.ts';
import { normalizeIdeaStatus, parseIdeaStatus } from '../utils/idea-status.ts';
import { getPracticeFlowSummary } from '../services/practice-flow-store.ts';
import { getAdminRepository } from '../infrastructure/container.ts';

const router = Router();
const logger = createSafeLogger('admin-route');
const resourceIdSchema = z.object({ id: z.string().trim().min(1).max(120) }).strict();
const ideaStatusSchema = z.object({ status: z.string().trim().min(1).max(32) }).strict();

router.use(authenticate, isAdmin);

function serializeFeedback(item: any) {
  return {
    id: item.id,
    type: item.type,
    text: item.content,
    adminResponse: item.adminResponse,
    status: item.status,
    trackingNum: item.trackingNum,
    createdAt: item.createdAt,
    user: item.user ? sanitizePublicUserIdentity(item.user) : undefined,
  };
}

router.get('/users', async (req, res) => {
  const users = await getAdminRepository().findUsers();

  res.json(users.map((user) => {
    return {
      ...sanitizeAdminUserIdentity(user),
      level: user.level,
      experience: user.experience,
      rating: user.rating,
      streakDays: user.streakDays,
      role: user.role,
      createdAt: user.createdAt,
      sessions: user.sessions,
    };
  }));
});

router.get('/stats', async (req, res) => {
  res.json(await getAdminRepository().getStats());
});

router.get('/practice-flow', (_req, res) => {
  res.json(getPracticeFlowSummary());
});

router.get('/feedback', async (req, res) => {
  try {
    const feedback = await getAdminRepository().findFeedback();

    res.json(feedback.map(serializeFeedback));
  } catch (error) {
    logger.error('Admin feedback list failed', { error: safeError(error) });
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

async function saveFeedbackResponse(req: any, res: any) {
  const parsed = feedbackResponseSchema.safeParse(req.validated!.body);
  if (!parsed.success) {
    handleValidationError(parsed, res);
    return;
  }

  try {
    const feedback = await getAdminRepository().respondToFeedback(
      req.validated!.params.id,
      parsed.data.response,
    );
    res.json({ success: true, feedback: serializeFeedback(feedback) });
  } catch (error) {
    logger.error('Admin feedback response failed', { error: safeError(error) });
    res.status(500).json({ error: 'Failed to save response' });
  }
}

router.post('/feedback/:id/respond', validateParams(resourceIdSchema), validateBody(feedbackResponseSchema), saveFeedbackResponse);
router.post('/feedback/:id/response', validateParams(resourceIdSchema), validateBody(feedbackResponseSchema), saveFeedbackResponse);

router.post('/ideas/:id/status', validateParams(resourceIdSchema), validateBody(ideaStatusSchema), async (req, res) => {
  const status = parseIdeaStatus(req.validated!.body.status);
  if (!status) {
    return res.status(400).json({ error: 'Invalid idea status' });
  }

  try {
    const idea = await getAdminRepository().updateIdeaStatus(req.validated!.params.id, status);
    res.json({ ...idea, status: normalizeIdeaStatus(idea.status) });
  } catch {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
