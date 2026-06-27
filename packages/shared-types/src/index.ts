export interface ClickEvent {
  cellId: number;
  reactionTimeMs: number;
}

export interface SessionResult {
  type: string;
  size?: number;
  timeMs: number;
  accuracy: number;
  score: number;
  errors: number;
}

export interface BrainIdPayload {
  brainId: string;
  token?: string;
  pin?: string;
}

export type DailyPracticeCategory = 'cognitive' | 'somatic' | 'safety';
export type PracticeReason = 'weak_area' | 'streak_maintenance' | 'variety' | 'recovery';

export interface PracticeRecommendation {
  moduleId: string;
  category: DailyPracticeCategory;
  reason: PracticeReason;
}

export interface PracticeRecommendedPayload {
  category: DailyPracticeCategory;
  moduleId: string;
  reason: PracticeReason;
  sourceSessionId: string;
}
