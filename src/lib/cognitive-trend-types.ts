export interface TrendPoint {
  date: string;
  accuracy: number;
  reactionMs: number;
  fatigueIndex: number;
  engagementIndex: number;
  sessionCount: number;
}

export interface CognitiveTrend {
  moduleId: string | null;
  category: string | null;
  points: TrendPoint[];
  overallDirection: 'improving' | 'stable' | 'declining';
  timespanDays: number;
  summary: {
    avgAccuracy: number;
    avgReactionMs: number;
    totalSessions: number;
  };
}
