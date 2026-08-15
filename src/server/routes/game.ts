import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateParams } from '../middleware/validate.ts';
import { authenticate } from '../middleware/auth.ts';
import { saveGameSchema, startGameAttemptSchema, updateMetadataSchema } from '../schemas/game.ts';
import { startGameAttempt } from '../services/game-attempt.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import { getGameServices } from '../infrastructure/container.ts';
import { sendDomainError } from '../errors/domain-error.ts';

const router = Router();
const logger = createSafeLogger('game-route');

router.get('/progress', authenticate, async (req: any, res) => {
  try {
    const services = getGameServices();
    const sessions = await services.progress.getUserProgress(req.user.id);
    res.json(sessions);
  } catch {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

router.post('/attempts', authenticate, validateBody(startGameAttemptSchema), async (req: any, res) => {
  try {
    const attempt = await startGameAttempt({ userId: req.user.id, ...req.validated.body });
    res.status(201).json(attempt);
  } catch (error) {
    if (sendDomainError(res, error)) return;
    logger.error('Game attempt creation failed', { error: safeError(error) });
    res.status(500).json({ error: 'Failed to create game attempt' });
  }
});

router.post('/save', authenticate, validateBody(saveGameSchema), async (req: any, res) => {
  const { clientRunId, attemptId, challenge, gameType, timeMs, metadata, analyticsJob } = req.validated.body;
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
    const services = getGameServices();
    const result = await services.completion.complete({
      userId: req.user.id,
      clientRunId,
      attemptId,
      challenge,
      gameType,
      timeMs,
      metadata,
      ...(analyticsJob === undefined ? {} : { analyticsJob }),
    });
    
    res.json(result);
  } catch (error) {
    if (sendDomainError(res, error)) return;
    logger.error('Game save failed', { error: safeError(error) });
    res.status(500).json({ error: 'Failed to save session' });
  }
});

const gameSessionParamsSchema = z.object({ id: z.string().min(1) }).strict();

router.post(
  '/session/:id/metadata',
  authenticate,
  validateParams(gameSessionParamsSchema),
  validateBody(updateMetadataSchema),
  async (req: any, res) => {
    const { metadata } = req.validated.body;
    const { id } = req.validated.params;

    try {
      const services = getGameServices();
      const updatedSession = await services.session.updateMetadata(id, req.user.id, metadata);
      res.json({ success: true, session: updatedSession });
    } catch (error) {
      if (sendDomainError(res, error)) return;
      logger.error('Session metadata update failed', {
        error: safeError(error),
        sessionLabel: `Session ${String(id).slice(0, 8)}`,
      });
      res.status(500).json({ error: 'Failed to update session metadata' });
    }
  },
);

router.get('/leaderboard', async (req, res) => {
  try {
    const services = getGameServices();
    const sanitizedUsers = await services.leaderboard.getTopUsers(50);
    res.json(sanitizedUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
