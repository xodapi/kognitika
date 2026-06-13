import { Router } from 'express';
import prisma from '../../lib/prisma.ts';
import { authenticate } from '../middleware/auth.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';

const router = Router();
const logger = createSafeLogger('dashboard-route');

// Вспомогательная функция перевода типов игр в русские названия
const getGameTitle = (type: string) => {
  const titles: Record<string, string> = {
    SCHULTE: 'Таблицы Шульте',
    STROOP: 'Эффект Струпа',
    N_BACK: 'Задача N-назад',
    NUMERICAL_ANALYSIS: 'Числовой анализ',
    LOGICAL_SEQUENCE: 'Логические матрицы',
    SPEED_TYPING: 'Скоростная печать',
    SPATIAL_CONCEALMENT: 'Пространство',
    TOPOLOGY_MEMORY: 'Архитектура контекста',
    COLLISION_DETECTOR: 'Детектор коллизий',
    ASYNC_DISPATCHER: 'Асинхронный диспетчер',
    NOISE_REDUCTION: 'Редукция шума',
    LANGUAGE_SCANNER: 'Смысловой сканер',
    DECRYPTOR: 'Декриптор',
    REALITY_CHECK: 'Проверка реальности',
    OBJECTIVE_FILTER: 'Объективный фильтр',
    PROFILING_RICE: 'Профайлинг RICE'
  };
  return titles[type] || type;
};

// Функция генерации квестов на основе профиля сессий
function generateTasksForWeakZone(sessions: any[], todaySessions: any[], weakZoneGame: string) {
  const weakGameTitle = getGameTitle(weakZoneGame);
  
  // Проверяем, играл ли пользователь сегодня в рекомендованную игру
  const playedWeakGameToday = todaySessions.some(s => s.gameType === weakZoneGame);
  
  // Проверяем, прошел ли пользователь хотя бы одну игру сегодня
  const playedAnyToday = todaySessions.length > 0;
  
  // Проверяем, улучшил ли пользователь свой результат сегодня
  let scoreImprovedToday = false;
  if (todaySessions.length > 0 && sessions.length > todaySessions.length) {
    const pastSessions = sessions.filter(s => !todaySessions.some(ts => ts.id === s.id));
    if (pastSessions.length > 0) {
      const avgPastScore = pastSessions.reduce((sum, s) => sum + s.score, 0) / pastSessions.length;
      scoreImprovedToday = todaySessions.some(s => s.score > avgPastScore * 1.05);
    }
  }

  return [
    {
      id: 'task_1',
      title: `Пройти тренажер «${weakGameTitle}» для тренировки слабой зоны`,
      text: `Пройти тренажер «${weakGameTitle}» для тренировки слабой зоны`,
      reward: 150,
      xp: 150,
      completed: playedWeakGameToday,
      gameType: weakZoneGame
    },
    {
      id: 'task_2',
      title: 'Пройти эмоциональный барометр Люшера до и после тренировки',
      text: 'Пройти эмоциональный барометр Люшера до и после тренировки',
      reward: 100,
      xp: 100,
      completed: playedAnyToday
    },
    {
      id: 'task_3',
      title: 'Побить свой средний результат в любом тренажере на 5%',
      text: 'Побить свой средний результат в любом тренажере на 5%',
      reward: 200,
      xp: 200,
      completed: scoreImprovedToday
    }
  ];
}

router.get('/status', authenticate, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Расчет прогресса уровня (каждые 500 XP = 1 уровень)
    const currentLevelXp = (user.level - 1) * 500;
    const levelProgress = Math.min(100, Math.max(0, Math.round(((user.experience - currentLevelXp) / 500) * 100)));

    // Расчет стриков
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let streakDays = user.streakDays;
    let isBroken = false;
    let streakMultiplier = 1.0;

    if (user.lastPlayedAt) {
      const lastPlayed = new Date(user.lastPlayedAt);
      const lastDay = new Date(lastPlayed.getFullYear(), lastPlayed.getMonth(), lastPlayed.getDate());
      const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        isBroken = true;
        streakDays = 0;
      }
    } else {
      isBroken = true;
      streakDays = 0;
    }

    if (streakDays >= 7) streakMultiplier = 2.0;
    else if (streakDays >= 3) streakMultiplier = 1.5;

    // Вычисляем слабую зону пользователя по последним 50 сессиям
    const sessions = await prisma.gameSession.findMany({
      where: { userId: user.id, isCompleted: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Фильтруем сессии, пройденные сегодня
    const startOfToday = new Date(today.getTime());
    const todaySessions = sessions.filter(s => new Date(s.createdAt) >= startOfToday);

    const domains = {
      attention: { games: ['SCHULTE', 'STROOP', 'SPEED_TYPING', 'N_BACK', 'NOISE_REDUCTION'], sum: 0, count: 0, defaultGame: 'SCHULTE' },
      memory: { games: ['N_BACK', 'SPATIAL_CONCEALMENT', 'TOPOLOGY_MEMORY'], sum: 0, count: 0, defaultGame: 'N_BACK' },
      logic: { games: ['NUMERICAL_ANALYSIS', 'LOGICAL_SEQUENCE', 'LANGUAGE_SCANNER', 'DECRYPTOR', 'REALITY_CHECK', 'OBJECTIVE_FILTER', 'PROFILING_RICE'], sum: 0, count: 0, defaultGame: 'OBJECTIVE_FILTER' },
      speed: { games: ['SPEED_TYPING', 'SCHULTE', 'COLLISION_DETECTOR'], sum: 0, count: 0, defaultGame: 'SPEED_TYPING' },
      resilience: { games: ['ASYNC_DISPATCHER', 'COLLISION_DETECTOR', 'NOISE_REDUCTION'], sum: 0, count: 0, defaultGame: 'NOISE_REDUCTION' }
    };

    sessions.forEach(s => {
      for (const [_, data] of Object.entries(domains)) {
        if (data.games.includes(s.gameType)) {
          data.sum += s.score;
          data.count += 1;
        }
      }
    });

    let weakestDomain = 'memory';
    let minAvg = Infinity;

    if (sessions.length === 0) {
      weakestDomain = 'memory';
    } else {
      for (const [domain, data] of Object.entries(domains)) {
        const avg = data.count > 0 ? data.sum / data.count : Infinity;
        if (avg < minAvg) {
          minAvg = avg;
          weakestDomain = domain;
        }
      }
    }

    const weakZoneGame = domains[weakestDomain as keyof typeof domains].defaultGame;

    const dailyTasks = generateTasksForWeakZone(sessions, todaySessions, weakZoneGame);

    res.json({
      levelProgress,
      role: user.role,
      streak: {
        days: streakDays,
        multiplier: streakMultiplier,
        isBroken
      },
      dailyTasks
    });
  } catch (error) {
    logger.error('Dashboard status failed', { error: safeError(error) });
    res.status(500).json({ error: 'Ошибка получения статуса' });
  }
});

export default router;
