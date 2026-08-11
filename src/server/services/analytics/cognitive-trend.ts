import { computeCognitiveTrend } from '../analytics-persistence.ts';

export type CognitiveTrendInput = {
  userId: string;
  moduleId?: string;
  days: number;
};

export class CognitiveTrendService {
  async getCognitiveTrend(input: CognitiveTrendInput) {
    return computeCognitiveTrend(
      input.userId,
      input.moduleId ?? null,
      input.days,
    );
  }
}
