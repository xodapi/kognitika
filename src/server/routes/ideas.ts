import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../../lib/prisma.ts';
import { authenticate } from '../middleware/auth.ts';
import { handleValidationError } from '../utils/validation.ts';
import { sanitizePublicUserIdentity } from '../utils/privacy.ts';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

const ideaSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(10).max(5000),
});

function optionalUserId(req: any) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string };
    return decoded.id || null;
  } catch {
    return null;
  }
}

router.get('/', async (req: any, res) => {
  try {
    const userId = optionalUserId(req);
    const ideas = await prisma.idea.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            pseudonym: true,
            brainId: true,
          },
        },
        votes: userId ? {
          where: { userId },
          select: { id: true },
        } : false,
        _count: {
          select: { votes: true },
        },
      },
    });

    res.json(ideas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      status: idea.status,
      createdAt: idea.createdAt,
      author: sanitizePublicUserIdentity(idea.user),
      _count: idea._count,
      userHasVoted: Array.isArray(idea.votes) && idea.votes.length > 0,
    })));
  } catch (error) {
    console.error('[Ideas] List error:', error);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

router.post('/', authenticate, async (req: any, res) => {
  const result = ideaSchema.safeParse(req.body);
  const validationError = handleValidationError(result, res);
  if (validationError) return validationError;

  try {
    const idea = await prisma.idea.create({
      data: {
        userId: req.user.id,
        title: result.data.title,
        description: result.data.description,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            pseudonym: true,
            brainId: true,
          },
        },
        _count: {
          select: { votes: true },
        },
      },
    });

    res.status(201).json({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      status: idea.status,
      createdAt: idea.createdAt,
      author: sanitizePublicUserIdentity(idea.user),
      _count: idea._count,
      userHasVoted: false,
    });
  } catch (error) {
    console.error('[Ideas] Create error:', error);
    res.status(500).json({ error: 'Failed to create idea' });
  }
});

router.post('/:id/vote', authenticate, async (req: any, res) => {
  try {
    const idea = await prisma.idea.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!idea) return res.status(404).json({ error: 'Idea not found' });

    await prisma.ideaVote.upsert({
      where: {
        ideaId_userId: {
          ideaId: req.params.id,
          userId: req.user.id,
        },
      },
      create: {
        ideaId: req.params.id,
        userId: req.user.id,
      },
      update: {},
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Ideas] Vote error:', error);
    res.status(500).json({ error: 'Failed to vote for idea' });
  }
});

export default router;
