import type { PrismaClient } from '@prisma/client';
import type {
  NotificationRecipient,
  NotificationRecipientRepository,
} from '../../repositories/notification-recipient-repository.ts';

export class PrismaNotificationRecipientRepository implements NotificationRecipientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByUserId(userId: string): Promise<NotificationRecipient | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, pseudonym: true },
    });
  }
}
