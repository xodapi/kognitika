import type { PrismaClient } from '@prisma/client';
import type {
  ChatHistoryMessage,
  ChatRepository,
  ChatSender,
} from '../../repositories/chat-repository.ts';

export class PrismaChatRepository implements ChatRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findRecentGlobalMessages(limit: number): Promise<ChatHistoryMessage[]> {
    return this.prisma.message.findMany({
      where: { room: 'global' },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
  }

  findSender(userId: string): Promise<ChatSender | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, pseudonym: true },
    });
  }

  async createGlobalMessage(userId: string, content: string): Promise<void> {
    await this.prisma.message.create({
      data: { content, userId, room: 'global' },
    });
  }
}
