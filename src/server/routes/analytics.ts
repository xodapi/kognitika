import { Router } from 'express';
import prisma from '../../lib/prisma.ts';
import { authenticate } from '../middleware/auth.ts';
import jwt from 'jsonwebtoken';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import {
  KNOWLEDGE_ARTICLE_BY_ID,
  TRAINING_KNOWLEDGE_ROUTE_IDS,
} from '../../lib/knowledge-base.ts';
import { resolvePracticeModuleId } from '../../lib/practice-recommendations.ts';
import {
  persistSessionAnalyticsSummary,
  getSessionAnalyticsSummaries,
  getModuleTrendData,
  getAggregateTrendData,
  computeCognitiveTrend,
} from '../services/analytics-persistence.ts';
import { createSessionAnalyticsSummary, parseSessionAnalyticsJob } from '../../core/analyze-session/index.ts';

const router = Router();
const logger = createSafeLogger('analytics-route');
const PROFILE_READY_SESSION_THRESHOLD = 5;
const MAX_EXPORT_SESSIONS = 1000;

function roundedAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function scoreTrendPercent(scores: number[]): number | null {
  if (scores.length < 2) return null;

  const splitAt = Math.ceil(scores.length / 2);
  const earlier = roundedAverage(scores.slice(0, splitAt));
  const recent = roundedAverage(scores.slice(splitAt));
  if (earlier === null || recent === null || earlier === 0) return null;

  return Math.round(((recent - earlier) / Math.abs(earlier)) * 100);
}

function createPrivacySafeAnalyticsExport(sessions: Array<{
  gameType: string;
  score: number;
  timeMs: number;
  createdAt: Date;
}>, historyTruncated: boolean) {
  const grouped = new Map<string, typeof sessions>();
  let includedSessions = 0;

  for (const session of sessions) {
    const moduleId = resolvePracticeModuleId(String(session.gameType));
    if (!moduleId) continue;
    const current = grouped.get(moduleId) || [];
    current.push(session);
    grouped.set(moduleId, current);
    includedSessions += 1;
  }

  const modules = TRAINING_KNOWLEDGE_ROUTE_IDS.map((moduleId) => {
    const moduleSessions = (grouped.get(moduleId) || [])
      .slice()
      .reverse();
    const scores = moduleSessions.map((session) => session.score);
    const durations = moduleSessions.map((session) => session.timeMs).filter((value) => value > 0);
    const article = KNOWLEDGE_ARTICLE_BY_ID.get(moduleId);

    return {
      module_id: moduleId,
      trainer: article?.title || moduleId,
      trains: article?.trains || '',
      metrics_interpretation: article?.metrics || '',
      completed_sessions: moduleSessions.length,
      score: {
        average: roundedAverage(scores),
        best: scores.length > 0 ? Math.max(...scores) : null,
        change_percent_early_vs_recent: scoreTrendPercent(scores),
      },
      duration_ms: {
        average: roundedAverage(durations),
        best: durations.length > 0 ? Math.min(...durations) : null,
      },
    };
  });

  return {
    format: 'Kognitika Privacy-Safe Cognitive Analytics',
    version: '2.0',
    privacy: {
      personal_identifiers_included: false,
      raw_session_data_included: false,
      exact_activity_timestamps_included: false,
      safe_for_external_llm: true,
    },
    dataset: {
      completed_sessions_analyzed: includedSessions,
      modules_with_data: modules.filter((module) => module.completed_sessions > 0).length,
      history_truncated: historyTruncated,
      maximum_sessions_analyzed: MAX_EXPORT_SESSIONS,
    },
    modules,
    instructions_for_llm: [
      'Analyze only training dynamics and do not infer identity, diagnosis, IQ, or medical condition.',
      'Compare modules with at least two completed sessions and treat small samples as uncertain.',
      'Look for stable strengths and growth areas using score and duration trends supported by the aggregates.',
      'Return a calm seven-day practice plan with rest periods and explain the evidence for each suggestion.',
    ],
    limitations: [
      'Training results depend on sleep, stress, device, environment, and familiarity with the task.',
      'This dataset supports wellness reflection and is not medical or psychological diagnosis.',
    ],
  };
}

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

    const sessionsCount = sessions.length;
    const requiredSessions = PROFILE_READY_SESSION_THRESHOLD;
    const remainingSessions = Math.max(0, requiredSessions - sessionsCount);

    if (sessionsCount < requiredSessions) {
      return res.json({
        profile: null,
        trend: 0,
        sessionsCount,
        requiredSessions,
        remainingSessions,
        message: 'Профиль станет точнее после нескольких завершенных тренировок'
      });
    }

    const profile = calculateProfile(sessions);
    
    // Вычисляем динамику (сравнение последних 10 с предыдущими 10)
    const recent = sessions.slice(0, 10);
    const previous = sessions.slice(10, 20);
    const trend = calculateTrend(recent, previous);

    res.json({ 
      profile, 
      trend,
      sessionsCount,
      requiredSessions,
      remainingSessions: 0,
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
      where: { userId: req.user.id, isCompleted: true },
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_SESSIONS + 1,
      select: {
        gameType: true,
        score: true,
        timeMs: true,
        createdAt: true,
      },
    });

    const historyTruncated = sessions.length > MAX_EXPORT_SESSIONS;
    const exportData = createPrivacySafeAnalyticsExport(
      sessions.slice(0, MAX_EXPORT_SESSIONS),
      historyTruncated,
    );

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

/**
 * POST /api/analytics/summaries — persist a SessionAnalyticsSummaryRecord
 */
router.post('/summaries', authenticate, async (req: any, res) => {
  try {
    const parsed = parseSessionAnalyticsJob(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid session analytics job', details: String(parsed.error) });
    }

    const gameSession = await prisma.gameSession.findFirst({
      where: {
        id: parsed.data.session.sessionId,
        userId: req.user.id,
      },
      select: { id: true },
    });
    if (!gameSession) {
      return res.status(403).json({ error: 'Session does not belong to authenticated user' });
    }

    const summary = createSessionAnalyticsSummary(parsed.data);
    await persistSessionAnalyticsSummary(req.user.id, summary);

    res.status(201).json({ ok: true, jobId: summary.jobId });
  } catch (err) {
    logger.error('Failed to persist analytics summary', { error: safeError(err) });
    res.status(500).json({ error: 'Failed to persist analytics summary' });
  }
});

/**
 * GET /api/analytics/summaries — query persisted summaries
 * Query params: moduleId, category, from, to, limit
 */
router.get('/summaries', authenticate, async (req: any, res) => {
  try {
    const { moduleId, category, from, to, limit } = req.query;

    const summaries = await getSessionAnalyticsSummaries({
      userId: req.user.id,
      moduleId: moduleId as string | undefined,
      category: category as string | undefined,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({ summaries });
  } catch (err) {
    logger.error('Failed to query analytics summaries', { error: safeError(err) });
    res.status(500).json({ error: 'Failed to query analytics summaries' });
  }
});

/**
 * GET /api/analytics/summaries/trend — trend-ready aggregated data
 * Query params: moduleId (optional), days (default 30)
 */
router.get('/summaries/trend', authenticate, async (req: any, res) => {
  try {
    const { moduleId, days } = req.query;
    const daysNum = days ? parseInt(days as string, 10) : 30;

    const trend = moduleId
      ? await getModuleTrendData(req.user.id, moduleId as string, daysNum)
      : await getAggregateTrendData(req.user.id, daysNum);

    res.json({ trend, days: daysNum, moduleId: moduleId || null });
  } catch (err) {
    logger.error('Failed to compute trend data', { error: safeError(err) });
    res.status(500).json({ error: 'Failed to compute trend data' });
  }
});

/**
 * GET /api/analytics/cognitive-trend — full CognitiveTrend with direction detection
 * Query params: moduleId (optional), days (default 30)
 */
router.get('/cognitive-trend', authenticate, async (req: any, res) => {
  try {
    const { moduleId, days } = req.query;
    const daysNum = days ? parseInt(days as string, 10) : 30;

    const trend = await computeCognitiveTrend(
      req.user.id,
      moduleId ? (moduleId as string) : null,
      daysNum,
    );

    res.json(trend);
  } catch (err) {
    logger.error('Failed to compute cognitive trend', { error: safeError(err) });
    res.status(500).json({ error: 'Failed to compute cognitive trend' });
  }
});

export default router;
