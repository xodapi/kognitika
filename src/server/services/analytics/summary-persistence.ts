import { createSessionAnalyticsSummary, parseSessionAnalyticsJob } from '../../../core/analyze-session/index.ts';
import { persistSessionAnalyticsSummary } from '../analytics-persistence.ts';

export type PersistSummaryInput = {
  userId: string;
  sessionId: string;
  job: unknown;
};

export class SummaryPersistenceService {
  async persistSummary(input: PersistSummaryInput): Promise<{ success: boolean }> {
    const parsedJob = parseSessionAnalyticsJob(input.job);
    if (!parsedJob.success) {
      throw new Error('Invalid session analytics job');
    }
    const summary = createSessionAnalyticsSummary(parsedJob.data);

    await persistSessionAnalyticsSummary(input.userId, summary);

    return { success: true };
  }
}
