import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../../lib/prisma.ts';
import { handleValidationError } from '../utils/validation.ts';
import { sendMagicLinkEmail } from '../services/mail.ts';
import { generateBrainId, generatePseudonym } from '../utils/brain-id.ts';
import { magicLinkSchema, verifySchema, loginSchema, registerSchema, resumeSchema } from '../schemas/auth.ts';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

// Роуты
router.post('/magic-link', async (req, res) => {
  const result = magicLinkSchema.safeParse(req.body);
  const validationError = handleValidationError(result, res);
  if (validationError) return validationError;

  const { email } = result.data;
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, name: email.split('@')[0] } });
  }

  const magicToken = jwt.sign({ id: user.id, type: 'magic' }, JWT_SECRET, { expiresIn: '15m' });
  const magicUrl = `${process.env.FRONTEND_URL || 'http://localhost:3006'}/auth/verify`;

  try {
    await sendMagicLinkEmail(email, magicToken, magicUrl);
    res.json({ success: true, message: 'Magic link sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

router.post('/verify-magic', async (req, res) => {
  const result = verifySchema.safeParse(req.body);
  const validationError = handleValidationError(result, res);
  if (validationError) return validationError;

  try {
    const { token } = result.data;
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'magic') throw new Error('Invalid token type');

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const longToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token: longToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch {
    res.status(401).json({ error: 'Link expired or invalid' });
  }
});

router.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  const validationError = handleValidationError(result, res);
  if (validationError) return validationError;

  try {
    const { email, password, name } = result.data;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, name, password: hashedPassword } });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch {
    res.status(400).json({ error: 'Email maybe already in use' });
  }
});

router.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  const validationError = handleValidationError(result, res);
  if (validationError) return validationError;

  try {
    const { email, password } = result.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

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

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '365d' }); 
    res.json({ 
      token, 
      brainId, 
      pseudonym: user.pseudonym
    });
  } catch (error) {
    console.error('[Auth] Brain session error:', error);
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

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '365d' });
    res.json({ 
      token, 
      pseudonym: user.pseudonym
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore brain session' });
  }
});

export default router;
