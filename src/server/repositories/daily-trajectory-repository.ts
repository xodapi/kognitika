import type { DailyPracticeItem } from '../../lib/daily-practice-types.ts';

export type DailyTrajectorySession = {
  gameType: string;
  score: number;
  createdAt: Date;
};

export type DailyPracticePlanRecord = {
  id: string;
  items: DailyPracticeItem[];
};

export interface DailyTrajectoryRepository {
  findRecentCompletedSessions(userId: string, limit: number): Promise<DailyTrajectorySession[]>;
  findPlan(userId: string, date: Date): Promise<DailyPracticePlanRecord | null>;
  createPlan(userId: string, date: Date, items: DailyPracticeItem[]): Promise<void>;
  replacePlanItems(planId: string, items: DailyPracticeItem[]): Promise<void>;
}
