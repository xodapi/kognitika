import type { AnalyticsJobWriter, AnalyticsWriteContext } from '../../services/game-save/analytics-job-writer.ts';
import type { CompletedSessionAnalyticsJob } from '../../../core/cognitive-events/index.ts';
import {
  createAnalyticsOutboxEntry,
  isAnalyticsOutboxEnabled,
} from '../../../core/analytics-outbox/index.ts';

const SHADOW_ANALYZER_VERSION = 'rust-shadow-v1';
const ANALYTICS_CONTRACT_VERSION = 'analytics-contract-v1';

export class PrismaAnalyticsJobWriter implements AnalyticsJobWriter {
  async write(
    tx: AnalyticsWriteContext,
    sessionId: string,
    analyticsJob: CompletedSessionAnalyticsJob | undefined,
    occurredAt: Date,
  ): Promise<void> {
    if (analyticsJob) {
      await tx.completedSessionAnalyticsJob.create({
        data: {
          jobId: analyticsJob.jobId,
          gameSessionId: sessionId,
          moduleId: analyticsJob.moduleId,
          moduleVersion: analyticsJob.moduleVersion,
          category: analyticsJob.category,
          analyzerVersion: analyticsJob.analyzerVersion,
          completedAt: new Date(analyticsJob.completedAt),
          payload: analyticsJob,
        },
      });
    }

    if (analyticsJob && isAnalyticsOutboxEnabled()) {
      const entry = createAnalyticsOutboxEntry({
        sourceSession: sessionId,
        analyzerVersion: SHADOW_ANALYZER_VERSION,
        contractVersion: ANALYTICS_CONTRACT_VERSION,
        occurredAt,
      });
      await tx.analyticsOutboxEntry.create({
        data: {
          sourceSessionId: sessionId,
          analyzerVersion: entry.analyzerVersion,
          contractVersion: entry.contractVersion,
          idempotencyKey: entry.idempotencyKey,
          occurredAt: entry.occurredAt,
        },
      });
    }
  }
}
