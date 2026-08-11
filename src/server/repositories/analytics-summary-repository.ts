import type { SessionAnalyticsSummaryRecord } from '../../core/analyze-session/index.ts';

export type AnalyticsSummaryRow = {
  createdAt: Date;
  accuracy: number;
  p50ReactionMs: number;
  fatigueIndex: number;
  engagementIndex: number;
};

export type AnalyticsSummaryQuery = {
  userId: string;
  moduleId?: string;
  category?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

export interface AnalyticsSummaryRepository {
  upsert(userId: string, record: SessionAnalyticsSummaryRecord): Promise<void>;
  findSummaries(query: AnalyticsSummaryQuery): Promise<AnalyticsSummaryRow[]>;
  findTrendRows(userId: string, moduleId: string | null, from: Date): Promise<AnalyticsSummaryRow[]>;
}
