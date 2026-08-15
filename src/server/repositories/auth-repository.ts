export type BrainIdentityUser = {
  id: string;
  name: string | null;
  brainId: string | null;
  pseudonym: string | null;
  role: string;
  level: number;
  experience: number;
  rating: number;
  streakDays: number;
};

export interface AuthRepository {
  createBrainUser(brainId: string, pseudonym: string): Promise<BrainIdentityUser>;
  findByBrainId(brainId: string): Promise<BrainIdentityUser | null>;
}
