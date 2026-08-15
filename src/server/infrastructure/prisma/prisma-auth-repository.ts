import type { PrismaClient } from '@prisma/client';
import type { AuthRepository, BrainIdentityUser } from '../../repositories/auth-repository.ts';

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createBrainUser(brainId: string, pseudonym: string): Promise<BrainIdentityUser> {
    return this.prisma.user.create({
      data: {
        brainId,
        pseudonym,
        name: pseudonym,
        experience: 100,
        role: 'USER',
        xpEvents: {
          create: {
            amount: 100,
            reason: 'Welcome Bonus',
          },
        },
      },
    });
  }

  findByBrainId(brainId: string): Promise<BrainIdentityUser | null> {
    return this.prisma.user.findUnique({ where: { brainId } });
  }
}
