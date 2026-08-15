export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type GameSessionRecord = {
  id: string;
  userId: string;
  clientRunId: string | null;
  gameType: string;
  score: number;
  timeMs: number;
  isCompleted: boolean;
  metadata: JsonValue;
  createdAt: Date;
};

export type CreateGameSessionInput = {
  userId: string;
  clientRunId?: string;
  gameType: string;
  score: number;
  timeMs: number;
  metadata: JsonValue;
};

export interface GameSessionRepository {
  findCompletedByUser(userId: string): Promise<GameSessionRecord[]>;
  findById(sessionId: string): Promise<GameSessionRecord | null>;
  findByClientRun(userId: string, clientRunId: string): Promise<GameSessionRecord | null>;
  createCompleted(input: CreateGameSessionInput): Promise<GameSessionRecord>;
  replaceMetadata(sessionId: string, metadata: JsonValue): Promise<GameSessionRecord>;
}
