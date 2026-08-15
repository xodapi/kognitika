export type AnalyticsSession = {
  gameType: string;
  score: number;
  timeMs: number;
  createdAt: Date;
};

export interface AnalyticsSessionRepository {
  findCompletedByUser(userId: string, limit?: number): Promise<AnalyticsSession[]>;
  findRecentCompletedByUserAndGameType(
    userId: string,
    gameType: string,
    limit: number,
  ): Promise<AnalyticsSession[]>;
  countCompletedByGameType(gameType: string): Promise<number>;
  countCompletedWithScoreBelow(gameType: string, score: number): Promise<number>;
}
