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

export type LongitudinalStrataProjectionRow = {
  occurredAt: Date;
  stratum: {
    moduleId: string;
    moduleVersion: string;
    difficulty: string;
    label: string;
  };
  completed: unknown;
  eventCount: unknown;
  suspiciousPatternScore: unknown;
  accuracy: unknown;
  reactionMs: unknown;
};

export type LongitudinalStrataProjection = {
  rows: LongitudinalStrataProjectionRow[];
  exclusions: Record<string, number>;
};

export interface LongitudinalStrataProjectionRepository {
  findLongitudinalStrataProjection(
    userId: string,
    moduleId: string,
    from: Date,
    to: Date,
  ): Promise<LongitudinalStrataProjection>;
}
