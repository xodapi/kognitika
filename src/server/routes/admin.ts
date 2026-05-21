import { Router } from 'express';
import prisma from '../../lib/prisma.ts';
import { authenticate, isAdmin } from '../middleware/auth.ts';

const router = Router();

router.use(authenticate, isAdmin);

router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    include: {
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });
  res.json(users);
});

router.get('/stats', async (req, res) => {
  const userCount = await prisma.user.count();
  const sessionCount = await prisma.gameSession.count();
  const averageScore = await prisma.gameSession.aggregate({
    _avg: { score: true }
  });
  res.json({ userCount, sessionCount, averageScore: averageScore._avg.score });
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
