export type LongitudinalObservationRow = {
  sourceSessionId: string;
  occurredAt: Date;
  accuracy: number;
  reactionMs: number;
};

export interface LongitudinalObservationRepository {
  findLongitudinalObservations(
    userId: string,
    moduleId: string,
    from: Date,
    to: Date,
  ): Promise<LongitudinalObservationRow[]>;
}
