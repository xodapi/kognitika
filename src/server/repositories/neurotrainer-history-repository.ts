export type NeurotrainerHistorySession = {
  score: number;
  timeMs: number;
  metadata: unknown;
};

export interface NeurotrainerHistoryRepository {
  findRecentCompletedByGameType(
    userId: string,
    gameType: string,
    limit: number,
  ): Promise<NeurotrainerHistorySession[]>;
}
