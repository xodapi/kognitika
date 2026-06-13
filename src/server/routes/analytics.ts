import { Router } from 'express';
import prisma from '../../lib/prisma.ts';
import { authenticate } from '../middleware/auth.ts';
import jwt from 'jsonwebtoken';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import { brainLabelForIdentity, displayNameForIdentity } from '../utils/privacy.ts';

const router = Router();
const logger = createSafeLogger('analytics-route');

/**
 * Сравнивает результаты текущей игры с историей пользователя
 */
router.get('/compare', async (req: any, res) => {
  try {
    const gameType = (req.query.gameType as string || 'SCHULTE').toUpperCase();
    const currentScore = Number(req.query.score) || 0;
    const currentTimeMs = Number(req.query.timeMs) || 0;
    const currentErrors = Number(req.query.errors) || 0;

    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        userId = decoded.id;
      } catch (err) {
        // Игнорируем ошибки верификации, продолжаем как гость
      }
    }

    let deltaPercentage = 0;
    let trend: 'up' | 'down' | 'stable' = 'stable';

    if (userId) {
      // Ищем последние 10 успешных сессий этого типа
      const history = await prisma.gameSession.findMany({
        where: { userId, gameType: gameType as any, isCompleted: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      if (history.length > 0) {
        const avgScore = history.reduce((sum, s) => sum + s.score, 0) / history.length;
        if (avgScore > 0) {
          deltaPercentage = Math.round(((currentScore - avgScore) / avgScore) * 100);
          if (deltaPercentage > 0) {
            trend = 'up';
          } else if (deltaPercentage < 0) {
            trend = 'down';
            deltaPercentage = Math.abs(deltaPercentage);
          }
        }
      }
    }

    // Вычисляем перцентиль игрока по всем сессиям данного типа
    const totalSessionsCount = await prisma.gameSession.count({
      where: { gameType: gameType as any, isCompleted: true }
    });
    const lowerSessionsCount = await prisma.gameSession.count({
      where: { gameType: gameType as any, isCompleted: true, score: { lt: currentScore } }
    });

    let percentile = totalSessionsCount > 0 
      ? Math.round((lowerSessionsCount / totalSessionsCount) * 100) 
      : 75;
    
    if (percentile <= 0) percentile = 12;
    if (percentile >= 100) percentile = 98;

    // Генерируем вердикт с поддержкой при ухудшении (антифрустрация)
    let verdict = 'Отличная тренировка! Стабильные показатели когнитивных функций.';
    
    if (trend === 'down') {
      if (deltaPercentage >= 5 && deltaPercentage <= 15) {
        verdict = 'Колебания естественны. Мозг обрабатывает информацию и консолидирует навык. Завтра показатели стабилизируются.';
      } else if (deltaPercentage > 15 && deltaPercentage <= 30) {
        verdict = 'Ваша когнитивная батарейка разряжена. Не перенапрягайтесь. Отдых — это тоже часть тренировочного процесса.';
      } else if (deltaPercentage > 30) {
        verdict = 'Сегодня не лучший день для рекордов, и это совершенно нормально. Сделайте перерыв и попробуйте расслабляющий модуль «Тишина».';
      }
    } else if (currentErrors > 3) {
      verdict = 'Вы взяли отличный темп, но точность пострадала. Попробуйте сбавить скорость ради лучшего контроля и точности.';
    } else if (trend === 'up' && deltaPercentage > 5) {
      verdict = `Превосходно! Ваш результат улучшился на ${deltaPercentage}% по сравнению с вашим средним уровнем. Когнитивный фокус в оптимальном состоянии.`;
    }

    // Карта рекомендаций
    const recommendations: Record<string, { game: string, title: string }> = {
      SCHULTE: { game: 'stroop', title: 'Эффект Струпа' },
      STROOP: { game: 'nback', title: 'Задача N-назад' },
      N_BACK: { game: 'numerical', title: 'Числовой анализ' },
      NUMERICAL_ANALYSIS: { game: 'logical', title: 'Логические матрицы' },
      LOGICAL_SEQUENCE: { game: 'spatial', title: 'Пространство' },
      SPATIAL_CONCEALMENT: { game: 'topology', title: 'Архитектура контекста' },
      TOPOLOGY_MEMORY: { game: 'collision', title: 'Детектор коллизий' },
      COLLISION_DETECTOR: { game: 'dispatcher', title: 'Асинхронный диспетчер' },
      ASYNC_DISPATCHER: { game: 'noise', title: 'Редукция шума' },
      NOISE_REDUCTION: { game: 'scanner', title: 'Смысловой сканер' },
      LANGUAGE_SCANNER: { game: 'decryptor', title: 'Декриптор' },
      DECRYPTOR: { game: 'reality', title: 'Проверка реальности' },
      REALITY_CHECK: { game: 'objective', title: 'Объективный фильтр' },
      OBJECTIVE_FILTER: { game: 'profiling', title: 'Профайлинг RICE' },
      PROFILING_RICE: { game: 'schulte', title: 'Таблицы Шульте' }
    };

    let recommendedGame = 'schulte';
    let recommendedGameTitle = 'Таблицы Шульте';

    // Если сильная усталость, принудительно рекомендуем дыхательную технику "Тишина"
    if (trend === 'down' && deltaPercentage > 15) {
      recommendedGame = 'silence';
      recommendedGameTitle = 'Нейрорегуляция: «Тишина»';
    } else {
      const rec = recommendations[gameType] || recommendations.SCHULTE;
      recommendedGame = rec.game;
      recommendedGameTitle = rec.title;
    }

    res.json({
      deltaPercentage,
      trend,
      percentile,
      verdict,
      recommendedGame,
      recommendedGameTitle
    });
  } catch (error) {
    logger.error('Analytics compare failed', { error: safeError(error) });
    res.status(500).json({ error: 'Ошибка сравнения результатов' });
  }
});


/**
 * Генерирует когнитивный профиль на основе последних 50 сессий
 */
router.get('/profile', authenticate, async (req: any, res) => {
  try {
    const sessions = await prisma.gameSession.findMany({
      where: { userId: req.user.id, isCompleted: true },
      orderBy: { createdAt: 'desc' },
      take: 100 // Берем больше данных для точности
    });

    if (sessions.length === 0) {
      return res.json({ profile: null, message: 'Недостаточно данных для анализа' });
    }

    const profile = calculateProfile(sessions);
    
    // Вычисляем динамику (сравнение последних 10 с предыдущими 10)
    const recent = sessions.slice(0, 10);
    const previous = sessions.slice(10, 20);
    const trend = calculateTrend(recent, previous);

    res.json({ 
      profile, 
      trend,
      sessionsCount: sessions.length,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Analytics profile failed', { error: safeError(error) });
    res.status(500).json({ error: 'Ошибка генерации профиля' });
  }
});

/**
 * Экспорт всех данных в LLM-friendly формате
 */
router.get('/export', authenticate, async (req: any, res) => {
  try {
    const sessions = await prisma.gameSession.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'asc' }
    });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const exportData = {
      version: "1.0",
      subject: {
        brain_label: user ? brainLabelForIdentity(user) : undefined,
        pseudonym: user ? displayNameForIdentity(user) : undefined,
        level: user?.level,
        rating: user?.rating,
        total_xp: user?.experience,
        streak: user?.streakDays
      },
      exported_at: new Date().toISOString(),
      data_structure: "Kognitika Cognitive Time-Series (KCTS)",
      sessions: sessions.map(s => ({
        id: s.id,
        timestamp: s.createdAt,
        type: s.gameType,
        metrics: {
          score: s.score,
          duration_ms: s.timeMs,
          performance_index: Math.round((s.score / (s.timeMs || 1)) * 1000)
        },
        payload: s.metadata
      })),
      instructions_for_llm: "Analyze the 'payload' field for specific error types and reaction latencies. 'performance_index' higher is better. Correlate 'type' across time to detect learning curves and fatigue thresholds."
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=kognitika_export_${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    res.status(500).json({ error: 'Ошибка экспорта данных' });
  }
});

function calculateProfile(sessions: any[]) {
    const categories: Record<string, string[]> = {
        attention: ['SCHULTE', 'STROOP', 'SPEED_TYPING', 'N_BACK', 'NOISE_REDUCTION'],
        memory: ['N_BACK', 'SPATIAL_CONCEALMENT', 'TOPOLOGY_MEMORY'],
        logic: ['NUMERICAL_ANALYSIS', 'LOGICAL_SEQUENCE', 'LANGUAGE_SCANNER', 'DECRYPTOR', 'REALITY_CHECK', 'SITUATIONAL_JUDGMENT'],
        speed: ['SPEED_TYPING', 'SCHULTE', 'COLLISION_DETECTOR'],
        resilience: ['ASYNC_DISPATCHER', 'COLLISION_DETECTOR', 'NOISE_REDUCTION']
    };

    const stats: Record<string, { sum: number, count: number }> = {};
    Object.keys(categories).forEach(cat => stats[cat] = { sum: 0, count: 0 });

    sessions.forEach(s => {
        for (const [cat, games] of Object.entries(categories)) {
            if (games.includes(s.gameType)) {
                // Взвешенный скор: новые сессии важнее? 
                // Для простоты пока среднее
                stats[cat].sum += s.score;
                stats[cat].count += 1;
            }
        }
    });

    const profile: Record<string, number> = {};
    for (const [cat, data] of Object.entries(stats)) {
        // Нормализуем к 100 (базовый скор в играх около 500-1000, 
        // поэтому берем Math.min(100, avg/10) для наглядности)
        const avg = data.count > 0 ? data.sum / data.count : 0;
        profile[cat] = Math.min(100, Math.round(avg / 10)); 
    }

    return profile;
}

function calculateTrend(recent: any[], previous: any[]) {
    if (recent.length === 0 || previous.length === 0) return 0;
    const avgRecent = recent.reduce((a, b) => a + b.score, 0) / recent.length;
    const avgPrev = previous.reduce((a, b) => a + b.score, 0) / previous.length;
    return Math.round(((avgRecent - avgPrev) / (avgPrev || 1)) * 100);
}

export default router;
