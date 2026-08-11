import {
  getSessionAnalyticsSummaries,
  getModuleTrendData,
  getAggregateTrendData,
} from '../analytics-persistence.ts';

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
  async getSummaries(input: SummariesQueryInput) {
    return getSessionAnalyticsSummaries({
      userId: input.userId,
      moduleId: input.moduleId,
      category: input.category,
      from: input.from ? new Date(input.from) : undefined,
      to: input.to ? new Date(input.to) : undefined,
      limit: input.limit,
    });
  }

  async getTrend(input: TrendQueryInput) {
    if (input.moduleId) {
      return getModuleTrendData(input.userId, input.moduleId, input.days);
    } else {
      return getAggregateTrendData(input.userId, input.days);
    }
  }
}
