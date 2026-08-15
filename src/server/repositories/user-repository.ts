export type UserRecord = {
  id: string;
  name: string | null;
  pseudonym: string | null;
  experience: number;
  level: number;
  rating: number;
  streakDays: number;
  lastPlayedAt: Date | null;
};

export type LeaderboardEntry = {
  name: string | null;
  pseudonym: string | null;
  experience: number;
  level: number;
  rating: number;
  _count: { sessions: number };
};

export type RecordProgressInput = {
  userId: string;
  experienceGain: number;
  streakDays: number;
  lastPlayedAt: Date;
  ratingGain?: number;
};

export interface UserRepository {
  findById(userId: string): Promise<UserRecord | null>;
  requireById(userId: string): Promise<UserRecord>;
  findTopByExperience(limit: number): Promise<LeaderboardEntry[]>;
  recordProgress(input: RecordProgressInput): Promise<UserRecord>;
  setLevel(userId: string, level: number): Promise<UserRecord>;
}
