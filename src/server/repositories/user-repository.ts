import type { User } from '@prisma/client';

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
  findById(userId: string): Promise<User | null>;
  requireById(userId: string): Promise<User>;
  findTopByExperience(limit: number): Promise<LeaderboardEntry[]>;
  recordProgress(input: RecordProgressInput): Promise<User>;
  setLevel(userId: string, level: number): Promise<User>;
}
