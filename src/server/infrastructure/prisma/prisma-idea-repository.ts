import type { PrismaClient } from '@prisma/client';
import type {
  CreateIdeaInput,
  IdeaRecord,
  IdeaRepository,
} from '../../repositories/idea-repository.ts';

const ideaInclude = {
  user: {
    select: {
      id: true,
      name: true,
      pseudonym: true,
      brainId: true,
    },
  },
  _count: {
    select: { votes: true },
  },
} as const;

export class PrismaIdeaRepository implements IdeaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(viewerUserId: string | null): Promise<IdeaRecord[]> {
    return this.prisma.idea.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ...ideaInclude,
        votes: viewerUserId ? {
          where: { userId: viewerUserId },
          select: { id: true },
        } : false,
      },
    });
  }

  create(input: CreateIdeaInput): Promise<IdeaRecord> {
    return this.prisma.idea.create({
      data: { ...input, status: 'PENDING' },
      include: ideaInclude,
    }).then((idea) => ({ ...idea, votes: [] }));
  }

  async exists(id: string): Promise<boolean> {
    return Boolean(await this.prisma.idea.findUnique({ where: { id }, select: { id: true } }));
  }

  async upsertVote(ideaId: string, userId: string): Promise<void> {
    await this.prisma.ideaVote.upsert({
      where: { ideaId_userId: { ideaId, userId } },
      create: { ideaId, userId },
      update: {},
    });
  }
}
