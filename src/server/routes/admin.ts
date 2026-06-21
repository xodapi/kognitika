import { Router } from 'express';
import prisma from '../../lib/prisma.ts';
import { authenticate, isAdmin } from '../middleware/auth.ts';
import { sanitizeAdminUserIdentity, sanitizePublicUserIdentity } from '../utils/privacy.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import { feedbackResponseSchema } from '../schemas/feedback.ts';
import { normalizeIdeaStatus, parseIdeaStatus } from '../utils/idea-status.ts';
import { getPracticeFlowSummary } from '../services/practice-flow-store.ts';

const router = Router();
const logger = createSafeLogger('admin-route');

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
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      brainId: true,
      pseudonym: true,
      level: true,
      experience: true,
      rating: true,
      streakDays: true,
      role: true,
      createdAt: true,
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          gameType: true,
          score: true,
          timeMs: true,
          isCompleted: true,
          createdAt: true,
        }
      }
    }
  });

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
  const userCount = await prisma.user.count();
  const sessionCount = await prisma.gameSession.count();
  const averageScore = await prisma.gameSession.aggregate({
    _avg: { score: true }
  });
  res.json({ userCount, sessionCount, averageScore: averageScore._avg.score });
});

router.get('/practice-flow', (_req, res) => {
  res.json(getPracticeFlowSummary());
});

router.get('/feedback', async (req, res) => {
  try {
    const feedback = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            pseudonym: true,
            brainId: true,
          },
        },
      },
    });

    res.json(feedback.map(serializeFeedback));
  } catch (error) {
    logger.error('Admin feedback list failed', { error: safeError(error) });
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

async function saveFeedbackResponse(req: any, res: any) {
  const parsed = feedbackResponseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid feedback response payload' });
  }

  try {
    const feedback = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { adminResponse: parsed.data.response, status: 'replied' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            pseudonym: true,
            brainId: true,
          },
        },
      },
    });
    res.json({ success: true, feedback: serializeFeedback(feedback) });
  } catch (error) {
    logger.error('Admin feedback response failed', { error: safeError(error) });
    res.status(500).json({ error: 'Failed to save response' });
  }
}

router.post('/feedback/:id/respond', saveFeedbackResponse);
router.post('/feedback/:id/response', saveFeedbackResponse);

router.post('/ideas/:id/status', async (req, res) => {
  const status = parseIdeaStatus(req.body?.status);
  if (!status) {
    return res.status(400).json({ error: 'Invalid idea status' });
  }

  try {
    const idea = await prisma.idea.update({ where: { id: req.params.id }, data: { status } });
    res.json({ ...idea, status: normalizeIdeaStatus(idea.status) });
  } catch {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
