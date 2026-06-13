import jwt from 'jsonwebtoken';
import { applyPrivacyRedaction } from './privacy.ts';
import prisma from '../../lib/prisma.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';

const JWT_SECRET = process.env.JWT_SECRET!;
const logger = createSafeLogger('auth-middleware');

export const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    applyPrivacyRedaction(req);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const isAdmin = async (req: any, res: any, next: any) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    req.user = { ...req.user, role: user.role };
    next();
  } catch (error) {
    logger.error('Admin role check failed', { error: safeError(error) });
    res.status(500).json({ error: 'Failed to verify admin access' });
  }
};
