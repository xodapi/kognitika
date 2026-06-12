import { Router } from 'express';
import prisma from '../../lib/prisma.ts';
import { authenticate, isAdmin } from '../middleware/auth.ts';
import { sanitizeAdminUserIdentity, sanitizePublicUserIdentity } from '../utils/privacy.ts';

const router = Router();

router.use(authenticate, isAdmin);

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

    res.json(feedback.map((item) => (
      {
        id: item.id,
        type: item.type,
        text: item.content,
        adminResponse: item.adminResponse,
        status: item.status,
        trackingNum: item.trackingNum,
        createdAt: item.createdAt,
        user: sanitizePublicUserIdentity(item.user),
      }
    )));
  } catch (error) {
    console.error('[Admin] Feedback list error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

router.post('/feedback/:id/respond', async (req, res) => {
  try {
    const { response } = req.body;
    const feedback = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { adminResponse: response, status: 'replied' }
    });
    res.json(feedback);
  } catch {
    res.status(500).json({ error: 'Failed to save response' });
  }
});

router.post('/feedback/:id/response', async (req, res) => {
  try {
    const { response } = req.body;
    const feedback = await prisma.feedback.update({
      where: { id: req.params.id },
      data: { adminResponse: response, status: 'replied' }
    });
    res.json({ success: true, feedback });
  } catch {
    res.status(500).json({ error: 'Failed to save response' });
  }
});

router.post('/ideas/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const idea = await prisma.idea.update({ where: { id: req.params.id }, data: { status } });
    res.json(idea);
  } catch {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
