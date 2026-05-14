import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const isAdmin = (req: any, res: any, next: any) => {
  // Проверка роли из токена или по email (если email в .env)
  const user = req.user;
  const isEmailAdmin = user?.email === process.env.ADMIN_EMAIL;
  const isRoleAdmin = user?.role === 'ADMIN';

  if (!isEmailAdmin && !isRoleAdmin) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};
