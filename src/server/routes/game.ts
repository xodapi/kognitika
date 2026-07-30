import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma.ts';
import { handleValidationError } from '../utils/validation.ts';
import { authenticate } from '../middleware/auth.ts';
import { saveGameSchema, startGameAttemptSchema, updateMetadataSchema } from '../schemas/game.ts';
import { eventBus } from '../events/event-bus.ts';
import { GameAttemptError, startGameAttempt } from '../services/game-attempt.ts';
import { saveCompletedGame } from '../services/game-save.ts';
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

router.post('/attempts', authenticate, async (req: any, res) => {
  const result = startGameAttemptSchema.safeParse(req.body);
  const validationError = handleValidationError(result, res);
  if (validationError) return validationError;

  try {
    const attempt = await startGameAttempt({ userId: req.user.id, ...result.data! });
    res.status(201).json(attempt);
  } catch (error) {
    if (error instanceof GameAttemptError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    logger.error('Game attempt creation failed', { error: safeError(error) });
    res.status(500).json({ error: 'Failed to create game attempt' });
  }
});

router.post('/save', authenticate, async (req: any, res) => {
  const result = saveGameSchema.safeParse(req.body);
  const validationError = handleValidationError(result, res);
  if (validationError) return validationError;

  const { clientRunId, attemptId, challenge, gameType, timeMs, metadata } = result.data!;
  if (!timeMs || timeMs < 100) {
    return res.status(400).json({ error: 'Invalid performance data' });
  }
  const hasAttemptCredentials = Boolean(attemptId || challenge);
  if (hasAttemptCredentials && (!attemptId || !challenge || !clientRunId)) {
    return res.status(400).json({ error: 'attemptId, challenge, and clientRunId are required together' });
  }
  if (!hasAttemptCredentials && process.env.GAME_SAVE_LEGACY_COMPAT_ENABLED !== 'true') {
    return res.status(400).json({ error: 'A game attempt is required' });
  }

  try {
    const saveResult = await saveCompletedGame({
      userId: req.user.id,
      clientRunId,
      attemptId,
      challenge,
      gameType,
      timeMs,
      metadata,
    });
    const currentLevel = Math.floor(saveResult.user.experience / 500) + 1;
    if (!saveResult.isReplay) {
      const EventBusClass: any = eventBus.constructor;
      eventBus.emit(EventBusClass.EVENTS.GAME_COMPLETED, {
        userId: req.user.id,
        sessionId: saveResult.session.id,
        score: saveResult.session.score,
        gameType,
        metadata,
      });
    }
    res.json({
      session: saveResult.session,
      newLevel: currentLevel,
      streakDays: saveResult.user.streakDays,
    });
  } catch (error) {
    if (error instanceof GameAttemptError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    logger.error('Game save failed', { error: safeError(error) });
    res.status(500).json({ error: 'Failed to save session' });
  }
});

router.post('/session/:id/metadata', authenticate, async (req: any, res) => {
  const parsed = updateMetadataSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid metadata payload' });
  }
  const { metadata } = parsed.data;

  try {
    const { id } = req.params;

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
