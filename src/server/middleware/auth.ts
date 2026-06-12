import jwt from 'jsonwebtoken';
import { applyPrivacyRedaction } from './privacy.ts';

const JWT_SECRET = process.env.JWT_SECRET!;

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

export const isAdmin = (req: any, res: any, next: any) => {
  const user = req.user;
  const isRoleAdmin = user?.role === 'ADMIN';

  if (!isRoleAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};
