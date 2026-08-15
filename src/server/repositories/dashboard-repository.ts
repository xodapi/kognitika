export type DashboardUser = {
  id: string;
  level: number;
  experience: number;
  role: string;
  streakDays: number;
  lastPlayedAt: Date | null;
};

export type DashboardSession = {
  id: string;
  gameType: string;
  score: number;
  createdAt: Date;
};

export interface DashboardRepository {
  findUser(userId: string): Promise<DashboardUser | null>;
  findRecentCompletedSessions(userId: string, limit: number): Promise<DashboardSession[]>;
}
