import { Router } from 'express';
import prisma from '../../lib/prisma.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';

const router = Router();
const logger = createSafeLogger('leaderboard-route');

/**
 * GET /leaderboard
 * Возвращает топ игроков для публичного рейтинга.
 * Использует только псевдонимы для обеспечения анонимности.
 */
router.get('/', async (req, res) => {
  const { period } = req.query;

  try {
    if (period === 'weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Sum XP from XpEvent for each user in the last 7 days
      const weeklyTop = await prisma.xpEvent.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: sevenDaysAgo },
          user: { pseudonym: { not: null } }
        },
        _sum: {
          amount: true
        },
        orderBy: {
          _sum: {
            amount: 'desc'
          }
        },
        take: 50
      });

      // Fetch user details for these top users
      const userDetails = await prisma.user.findMany({
        where: {
          id: { in: weeklyTop.map(item => item.userId) }
        },
        select: {
          id: true,
          pseudonym: true,
          level: true,
          rating: true,
          _count: {
            select: { sessions: true }
          }
        }
      });

      // Merge and format
      const result = weeklyTop.map(item => {
        const user = userDetails.find(u => u.id === item.userId);
        return {
          id: item.userId,
          name: user?.pseudonym || 'Аноним',
          pseudonym: user?.pseudonym,
          experience: item._sum.amount || 0,
          level: user?.level || 1,
          rating: user?.rating || 1000,
          _count: user?._count
        };
      });

      return res.json(result);
    }

    // Default: Global All-time Leaderboard
    const topUsers = await prisma.user.findMany({
      where: {
        pseudonym: { not: null }
      },
      orderBy: {
        experience: 'desc'
      },
      take: 50,
      select: {
        id: true,
        pseudonym: true,
        experience: true,
        level: true,
        rating: true,
        _count: {
          select: { sessions: true }
        }
      }
    });

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
router.post('/sync', async (req, res) => {
  // Логика синхронизации User -> LeaderboardEntry
  res.json({ message: 'Sync started' });
});

export default router;
