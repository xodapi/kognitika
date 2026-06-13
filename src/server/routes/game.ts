import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma.ts';
import { handleValidationError } from '../utils/validation.ts';
import { authenticate } from '../middleware/auth.ts';
import { saveGameSchema } from '../schemas/game.ts';
import { eventBus } from '../events/event-bus.ts';
import { computeServerScore } from '../services/game-score.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';

const router = Router();
const logger = createSafeLogger('game-route');

router.get('/progress', authenticate, async (req: any, res) => {
  try {
    const sessions = await prisma.gameSession.findMany({
      where: { userId: req.user.id, isCompleted: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(sessions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.post('/save', authenticate, async (req: any, res) => {
  const result = saveGameSchema.safeParse(req.body);
  const validationError = handleValidationError(result, res);
  if (validationError) return validationError;

  try {
    const { gameType, timeMs, metadata } = result.data;

    if (!timeMs || timeMs < 100) {
      return res.status(400).json({ error: 'Invalid performance data' });
    }

    const score = computeServerScore({ gameType, timeMs, metadata });

    const session = await prisma.gameSession.create({
      data: {
        userId: req.user.id,
        gameType: gameType as any,
        score,
        timeMs: timeMs || 0,
        isCompleted: true,
        metadata: (metadata || {}) as import('@prisma/client').Prisma.InputJsonValue
      }
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });

    let newStreak = currentUser?.streakDays || 0;
    if (currentUser?.lastPlayedAt) {
      const lastPlayed = new Date(currentUser.lastPlayedAt);
      const lastDay = new Date(lastPlayed.getFullYear(), lastPlayed.getMonth(), lastPlayed.getDate());
      const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) newStreak += 1;
      else if (diffDays > 1) newStreak = 1;
    } else {
      newStreak = 1;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        experience: { increment: score },
        streakDays: newStreak,
        lastPlayedAt: now,
        ...(metadata?.distraction && metadata.distraction !== 'none' ? {
          rating: { increment: Math.max(1, Math.floor(100000 / (timeMs || 10000)) - 5) }
        } : {})
      }
    });

    const currentLvl = Math.floor(user.experience / 500) + 1;
    const EventBusClass: any = eventBus.constructor;
    eventBus.emit(EventBusClass.EVENTS.GAME_COMPLETED, {
      userId: req.user.id,
      sessionId: session.id,
      score,
      gameType,
      metadata
    });

    if (currentLvl > user.level) {
      await prisma.user.update({ where: { id: user.id }, data: { level: currentLvl } });
    }

    res.json({ session, newLevel: currentLvl, streakDays: user.streakDays });
  } catch (error) {
    logger.error('Game save failed', { error: safeError(error) });
    res.status(500).json({ error: 'Failed to save session' });
  }
});

router.post('/session/:id/metadata', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { metadata } = req.body;

    const session = await prisma.gameSession.findUnique({
      where: { id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedSession = await prisma.gameSession.update({
      where: { id },
      data: {
        metadata: {
          ...(session.metadata as Record<string, any>),
          ...metadata
        }
      }
    });

    res.json({ success: true, session: updatedSession });
  } catch (error) {
    logger.error('Session metadata update failed', { error: safeError(error), sessionLabel: `Session ${String(req.params.id).slice(0, 8)}` });
    res.status(500).json({ error: 'Failed to update session metadata' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const topUsers = await prisma.user.findMany({
      take: 50,
      orderBy: { experience: 'desc' },
      select: {
        name: true,
        pseudonym: true,
        experience: true,
        level: true,
        rating: true,
        _count: {
          select: { sessions: true }
        }
      }
    });

    const sanitizedUsers = topUsers.map(user => ({
      ...user,
      name: user.name === user.pseudonym ? user.name : '[ANONYMOUS]'
    }));

    res.json(sanitizedUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
