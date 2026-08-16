import type { CompletedSessionAnalyticsJob } from '../../../core/cognitive-events/index.ts';

export type AnalyticsWriteContext = {
  completedSessionAnalyticsJob: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
  analyticsOutboxEntry: {
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
};

export interface AnalyticsJobWriter {
  write(
    tx: AnalyticsWriteContext,
    sessionId: string,
    analyticsJob: CompletedSessionAnalyticsJob | undefined,
    occurredAt: Date,
  ): Promise<void>;
}
