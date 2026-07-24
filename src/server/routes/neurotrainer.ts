import { Router } from 'express';
import prisma from '../../lib/prisma.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import { authenticate } from '../middleware/auth.ts';
import {
  AnalyzeTrainingRequestSchema,
  GenerateMentalMathRequestSchema,
  PrivacySafeHistoryEntrySchema,
} from '../schemas/neurotrainer.ts';
import {
  analyzeNeurotraining,
  generateMentalMathTraining,
} from '../services/neurotrainer.ts';

const router = Router();
const logger = createSafeLogger('neurotrainer-route');

function metadataNumber(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

router.post('/mental-math/generate', authenticate, async (req, res) => {
  const parsed = GenerateMentalMathRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid generation request' });
  }

  const result = await generateMentalMathTraining(parsed.data);
  return res.json(result);
});

router.post('/analyze', authenticate, async (req: any, res) => {
  const parsed = AnalyzeTrainingRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid analysis request' });
  }

  try {
    const sessions = await prisma.gameSession.findMany({
      where: {
        userId: req.user.id,
        gameType: parsed.data.gameType,
        isCompleted: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        score: true,
        timeMs: true,
        metadata: true,
      },
    });

    const history = sessions.flatMap((session) => {
      const errors = metadataNumber(session.metadata, 'errors') ?? 0;
      const storedAccuracy = metadataNumber(session.metadata, 'accuracy');
      const correctAnswers = metadataNumber(session.metadata, 'correctAnswers');
      const totalQuestions = metadataNumber(session.metadata, 'totalQuestions');
      const accuracy = storedAccuracy
        ?? (
          correctAnswers !== null && totalQuestions !== null && totalQuestions > 0
            ? (correctAnswers / totalQuestions) * 100
            : Math.max(0, 100 - errors * 5)
        );
      const safe = PrivacySafeHistoryEntrySchema.safeParse({
        score: session.score,
        timeMs: session.timeMs,
        errors,
        accuracy,
      });
      return safe.success ? [safe.data] : [];
    });

    const result = await analyzeNeurotraining({
      current: parsed.data,
      history,
    });
    return res.json(result);
  } catch (error) {
    logger.error('Neurotrainer analysis failed', { error: safeError(error) });
    return res.status(500).json({ error: 'Failed to analyze training' });
  }
});

export default router;
