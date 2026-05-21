import { Router } from 'express';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.ts';

const router = Router();
const chatBus = new EventEmitter();
const JWT_SECRET = process.env.JWT_SECRET!;

router.get('/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const lastMessages = await prisma.message.findMany({
      where: { room: 'global' },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } }
    });
    const history = lastMessages.reverse().map(m => ({
      id: m.id,
      content: m.content,
      userId: m.userId,
      userName: m.user.name || 'Машинист',
      createdAt: m.createdAt
    }));
    res.write(`event: history\ndata: ${JSON.stringify(history)}\n\n`);
  } catch (e) {
    console.error('[SSE] History load error:', e);
  }

  const onMessage = (msg: object) => {
    res.write(`event: message\ndata: ${JSON.stringify(msg)}\n\n`);
  };
  chatBus.on('message', onMessage);

  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(pingInterval);
    chatBus.off('message', onMessage);
  });
});

router.post('/messages', async (req: any, res) => {
  try {
    const { content, userName } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content required' });
    }

    let userId = 'anon';
    let resolvedName = 'Гость';
    const authHeader = req.headers.authorization?.split(' ')[1];
    
    if (authHeader) {
      try {
        const decoded: any = jwt.verify(authHeader, JWT_SECRET);
        userId = decoded.id;
        const dbUser = await prisma.user.findUnique({ 
          where: { id: userId }, 
          select: { name: true, pseudonym: true } 
        });
        resolvedName = dbUser?.pseudonym ?? dbUser?.name ?? 'Участник';
      } catch {}
    }

    if (userId !== 'anon') {
      await prisma.message.create({
        data: { content: content.trim(), userId, room: 'global' }
      });
    }

    const messageObj = {
      id: uuidv4(),
      content: content.trim(),
      userId,
      userName: resolvedName,
      room: 'global',
      createdAt: new Date()
    };

    chatBus.emit('message', messageObj);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
