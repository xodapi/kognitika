import type { PrismaClient } from '@prisma/client';
import type {
  CreatedFeedback,
  CreateFeedbackInput,
  FeedbackRepository,
} from '../../repositories/feedback-repository.ts';

export class PrismaFeedbackRepository implements FeedbackRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(input: CreateFeedbackInput): Promise<CreatedFeedback> {
    return this.prisma.feedback.create({
      data: input,
      select: { trackingNum: true },
    });
  }
}
