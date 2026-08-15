export type AdminIdentity = {
  id: string;
  name: string | null;
  pseudonym: string | null;
  brainId: string | null;
};

export type AdminUserRecord = AdminIdentity & {
  level: number;
  experience: number;
  rating: number;
  streakDays: number;
  role: string;
  createdAt: Date;
  sessions: Array<{
    id: string;
    gameType: string;
    score: number;
    timeMs: number;
    isCompleted: boolean;
    createdAt: Date;
  }>;
};

export type AdminFeedbackRecord = {
  id: string;
  type: string;
  content: string;
  adminResponse: string | null;
  status: string;
  trackingNum: string;
  createdAt: Date;
  user: AdminIdentity | null;
};

export type AdminStats = {
  userCount: number;
  sessionCount: number;
  averageScore: number | null;
};

export type AdminIdeaRecord = {
  id: string;
  title: string;
  description: string;
  status: string;
};

export interface AdminRepository {
  findUsers(): Promise<AdminUserRecord[]>;
  getStats(): Promise<AdminStats>;
  findFeedback(): Promise<AdminFeedbackRecord[]>;
  respondToFeedback(id: string, response: string): Promise<AdminFeedbackRecord>;
  updateIdeaStatus(id: string, status: string): Promise<AdminIdeaRecord>;
}
