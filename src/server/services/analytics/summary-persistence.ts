import { createSessionAnalyticsSummary, parseSessionAnalyticsJob } from '../../../core/analyze-session/index.ts';
import type { AnalyticsSummaryRepository } from '../../repositories/analytics-summary-repository.ts';
import { assertSafeAnalyticsSummary } from '../analytics-summary-policy.ts';

export type PersistSummaryInput = {
  userId: string;
  sessionId: string;
  job: unknown;
};

export class SummaryPersistenceService {
  constructor(private readonly summaries: AnalyticsSummaryRepository) {}

  async persistSummary(input: PersistSummaryInput): Promise<{ success: boolean }> {
    const parsedJob = parseSessionAnalyticsJob(input.job);
    if (!parsedJob.success) {
      throw new Error('Invalid session analytics job');
    }
    const summary = createSessionAnalyticsSummary(parsedJob.data);
    if (summary.sourceSessionId !== input.sessionId) {
      throw new Error('Analytics job session does not match requested session');
    }
    assertSafeAnalyticsSummary(summary);

    await this.summaries.upsert(input.userId, summary);

    return { success: true };
  }
}
