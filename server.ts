import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  app.use(express.json());

  // --- API Routes ---

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Auth Endpoints
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, name, password: hashedPassword }
      });
      const token = jwt.sign({ id: user.id }, JWT_SECRET);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      res.status(400).json({ error: 'Email maybe already in use' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
         res.status(401).json({ error: 'Invalid credentials' });
         return;
      }
      const token = jwt.sign({ id: user.id }, JWT_SECRET);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.get('/api/me', authenticate, async (req: any, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Failed to Fetch User' });
    }
  });

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { rating: 'desc' },
        take: 50,
        select: { id: true, name: true, rating: true, level: true, experience: true }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  app.get('/api/progress', authenticate, async (req: any, res) => {
    try {
      const sessions = await prisma.gameSession.findMany({
        where: { userId: req.user.id, isCompleted: true },
        orderBy: { createdAt: 'asc' }
      });
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.post('/api/game/save', authenticate, async (req: any, res) => {
    try {
      const { gameType, timeMs, metadata } = req.body;
      
      // Basic cheat prevention
      if (timeMs < 1000) return res.status(400).json({ error: 'Invalid time' });

      const score = Math.max(10, Math.floor(100000 / timeMs));

      const session = await prisma.gameSession.create({
        data: {
          userId: req.user.id,
          gameType,
          score,
          timeMs,
          isCompleted: true,
          metadata
        }
      });

      // Update user xp and rating
      const updateData: any = {
        experience: { increment: score }
      };
      
      // Very basic ELO-like rating increment if distractions were on
      if (metadata.distractions !== 'none') {
        const ratingIncrement = Math.max(1, Math.floor(100000 / timeMs) - 5);
        updateData.rating = { increment: ratingIncrement };
      }

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData
      });

      // Level up logic (every 500 xp = 1 level)
      const newLevel = Math.floor(user.experience / 500) + 1;
      if (newLevel > user.level) {
        await prisma.user.update({
          where: { id: user.id },
          data: { level: newLevel }
        });
      }

      res.json({ session, newLevel: Math.floor(user.experience / 500) + 1 });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save session' });
    }
  });

  // --- WebSocket (Symbol Chat) ---
  io.on('connection', (socket) => {
    socket.on('joinRoom', (room) => {
      socket.join(room);
    });

    socket.on('sendMessage', async (data) => {
      const messageObj = {
        content: data.content,
        userId: data.userId,
        userName: data.userName,
        room: data.room,
        createdAt: new Date()
      };
      
      io.to(data.room).emit('newMessage', messageObj);
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
       res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
