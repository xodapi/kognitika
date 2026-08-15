export type DuelParticipant = {
  id: string;
  name: string | null;
  pseudonym: string | null;
  brainId: string | null;
  rating: number | null;
  role: string | null;
};

export type DuelOutcome = {
  winnerId: string;
  loserId: string;
  winnerRating: number;
  loserRating: number;
};

export interface DuelRepository {
  findParticipant(userId: string): Promise<DuelParticipant | null>;
  recordOutcome(outcome: DuelOutcome): Promise<void>;
}
