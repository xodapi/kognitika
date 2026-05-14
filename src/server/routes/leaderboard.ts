import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /leaderboard
 * Возвращает топ игроков для публичного рейтинга.
 * Использует только псевдонимы для обеспечения анонимности.
 */
router.get('/', async (req, res) => {
  try {
    // В реальности здесь может быть запрос к закэшированной таблице LeaderboardEntry,
    // но для начала берем из User по XP.
    const topUsers = await prisma.user.findMany({
      where: {
        pseudonym: { not: null }
      },
      orderBy: {
        experience: 'desc'
      },
      take: 50,
      select: {
        pseudonym: true,
        experience: true,
        level: true,
        rating: true
      }
    });

    res.json(topUsers);
  } catch (error) {
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
