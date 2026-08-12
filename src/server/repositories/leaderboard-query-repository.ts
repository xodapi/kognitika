export type LeaderboardUser = {
  id: string;
  pseudonym: string | null;
  experience: number;
  level: number;
  rating: number;
  _count: { sessions: number };
};

export type WeeklyLeaderboardEntry = Omit<LeaderboardUser, 'experience'> & {
  experience: number;
};

export interface LeaderboardQueryRepository {
  findGlobal(limit: number): Promise<LeaderboardUser[]>;
  findWeekly(since: Date, limit: number): Promise<WeeklyLeaderboardEntry[]>;
}
