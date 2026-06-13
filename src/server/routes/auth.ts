import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import prisma from '../../lib/prisma.ts';
import { handleValidationError } from '../utils/validation.ts';
import { generateBrainId, generatePseudonym } from '../utils/brain-id.ts';
import { resumeSchema } from '../schemas/auth.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;
const logger = createSafeLogger('auth-route');

function signBrainToken(user: User) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      brainId: user.brainId,
      identity: 'brain',
    },
    JWT_SECRET,
    { expiresIn: '365d' },
  );
}

function serializeBrainUser(user: User) {
  const displayName = user.pseudonym || user.name || `Brain ${user.id.slice(0, 8)}`;

  return {
    id: user.id,
    name: displayName,
    email: null,
    brainId: user.brainId,
    pseudonym: user.pseudonym || displayName,
    role: user.role,
    level: user.level,
    experience: user.experience,
    rating: user.rating,
    streakDays: user.streakDays,
  };
}

function emailAuthDisabled(_req: Request, res: Response) {
  return res.status(410).json({
    error: 'Email authentication is disabled for public users. Use Brain ID.',
    code: 'email_auth_disabled',
  });
}

router.post('/magic-link', emailAuthDisabled);
router.post('/verify-magic', emailAuthDisabled);
router.post('/register', emailAuthDisabled);
router.post('/login', emailAuthDisabled);

// Анонимные сессии (Brain ID)
router.post('/brain', async (req, res) => {
  try {
    const brainId = generateBrainId();
    const pseudonym = generatePseudonym(brainId);
    
    const user = await prisma.user.create({
      data: {
        brainId,
        pseudonym,
        name: pseudonym,
        email: null,
        experience: 100, // Начальный бонус XP
        role: 'USER',
        xpEvents: {
          create: {
            amount: 100,
            reason: 'Welcome Bonus'
          }
        }
      }
    });

    const token = signBrainToken(user); 
    res.json({ 
      token, 
      brainId: user.brainId,
      pseudonym: user.pseudonym,
      user: serializeBrainUser(user),
    });
  } catch (error) {
    logger.error('Brain session initialization failed', { error: safeError(error) });
    res.status(500).json({ error: 'Failed to initialize brain session' });
  }
});

router.post('/restore', async (req, res) => {
  const result = resumeSchema.safeParse(req.body);
  const validationError = handleValidationError(result, res);
  if (validationError) return validationError;

  try {
    const { brainId } = result.data;
    const user = await prisma.user.findUnique({ where: { brainId } });
    
    if (!user) {
      return res.status(404).json({ error: 'Session not found. Please check your Brain ID.' });
    }

    const token = signBrainToken(user);
    res.json({ 
      token, 
      brainId: user.brainId,
      pseudonym: user.pseudonym,
      user: serializeBrainUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore brain session' });
  }
});

export default router;
