import { createHmac } from 'node:crypto';
import { Router } from 'express';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../../lib/prisma.ts';
import { createSafeLogger, safeError } from '../../lib/safe-logger.ts';
import { handleValidationError } from '../utils/validation.ts';
import { createSseConnectionManager, resolveSseConnectionLimits } from '../services/sse-connections.ts';

const messageSchema = z.object({
  content: z.string().min(1).max(500).trim(),
  userName: z.string().optional(),
});

const router = Router();
const chatBus = new EventEmitter();
const JWT_SECRET = process.env.JWT_SECRET!;
const logger = createSafeLogger('chat-route');
const sseConnections = createSseConnectionManager(resolveSseConnectionLimits());

export function publicChatSenderId(userId: string) {
  return createHmac('sha256', JWT_SECRET)
    .update(`chat-sender:${userId}`, 'utf8')
    .digest('base64url')
    .slice(0, 22);
}

router.get('/stream', async (req, res) => {
  const releaseConnection = sseConnections.acquire(req.ip || req.socket.remoteAddress || 'unknown');
  if (!releaseConnection) {
    res.setHeader('Retry-After', '30');
    res.status(429).json({ error: 'Too many active streams' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    releaseConnection();
    clearInterval(pingInterval);
    chatBus.off('message', onMessage);
    if (!res.writableEnded) res.end();
  };
  const write = (chunk: string) => {
    if (closed || res.writableEnded || !res.write(chunk)) {
      close();
      return false;
    }
    return true;
  };
  const onMessage = (msg: object) => {
    write(`event: message\ndata: ${JSON.stringify(msg)}\n\n`);
  };
  const pingInterval = setInterval(() => {
    write(': ping\n\n');
  }, 25000);

  req.once('close', close);
  req.once('aborted', close);
  res.once('error', close);

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
      senderId: publicChatSenderId(m.userId),
      userName: m.user.name || 'Машинист',
      createdAt: m.createdAt
    }));
    if (!write(`event: history\ndata: ${JSON.stringify(history)}\n\n`)) return;
  } catch (e) {
    logger.error('SSE history load failed', { error: safeError(e) });
  }

  if (!closed) chatBus.on('message', onMessage);
});

router.post('/messages', async (req: any, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    handleValidationError(parsed, res);
    return;
  }
  const { content } = parsed.data;

  try {

    let userId: string | null = null;
    let resolvedName = 'Гость';
    const authHeader = req.headers.authorization?.split(' ')[1];
    
    if (authHeader) {
      try {
        const decoded: any = jwt.verify(authHeader, JWT_SECRET);
        const authenticatedUserId = String(decoded.id);
        userId = authenticatedUserId;
        const dbUser = await prisma.user.findUnique({
          where: { id: authenticatedUserId },
          select: { name: true, pseudonym: true }
        });
        resolvedName = dbUser?.pseudonym ?? dbUser?.name ?? 'Участник';
      } catch {}
    }

    if (userId) {
      await prisma.message.create({
        data: { content: content.trim(), userId, room: 'global' }
      });
    }

    const messageObj = {
      id: uuidv4(),
      content: content.trim(),
      senderId: userId ? publicChatSenderId(userId) : `guest-${uuidv4()}`,
      userName: resolvedName,
      room: 'global',
      createdAt: new Date()
    };

    chatBus.emit('message', messageObj);
    res.json({ success: true, senderId: messageObj.senderId });
  } catch (e) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
