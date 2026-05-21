import { Router } from 'express';
import prisma from '../../lib/prisma.ts';
import { authenticate } from '../middleware/auth.ts';

const router = Router();

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
    console.error('[Analytics] Profile error:', error);
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
        id: user?.brainId || user?.id,
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
