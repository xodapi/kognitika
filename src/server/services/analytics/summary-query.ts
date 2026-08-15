import {
  type AnalyticsSummaryRepository,
} from '../../repositories/analytics-summary-repository.ts';
import { aggregateAnalyticsTrend } from './trend-aggregation.ts';

export type SummariesQueryInput = {
  userId: string;
  moduleId?: string;
  category?: 'cognitive' | 'somatic' | 'safety';
  from?: string;
  to?: string;
  limit: number;
};

export type TrendQueryInput = {
  userId: string;
  moduleId?: string;
  days: number;
};

export class SummaryQueryService {
  constructor(private readonly summaries: AnalyticsSummaryRepository) {}

  async getSummaries(input: SummariesQueryInput) {
    return this.summaries.findSummaries({
      userId: input.userId,
      moduleId: input.moduleId,
      category: input.category,
      from: input.from ? new Date(input.from) : undefined,
      to: input.to ? new Date(input.to) : undefined,
      limit: input.limit,
    });
  }

  async getTrend(input: TrendQueryInput) {
    const from = new Date();
    from.setDate(from.getDate() - input.days);
    const rows = await this.summaries.findTrendRows(input.userId, input.moduleId ?? null, from);
    return aggregateAnalyticsTrend(rows);
  }
}
