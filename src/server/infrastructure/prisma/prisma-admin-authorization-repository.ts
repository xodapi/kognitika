import type { PrismaClient } from '@prisma/client';
import type { AdminAuthorizationRepository } from '../../repositories/admin-authorization-repository.ts';

export class PrismaAdminAuthorizationRepository implements AdminAuthorizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findRole(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role ?? null;
  }
}
