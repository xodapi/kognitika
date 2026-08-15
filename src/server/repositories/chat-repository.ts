export type ChatHistoryMessage = {
  id: string;
  content: string;
  userId: string;
  createdAt: Date;
  user: { name: string | null };
};

export type ChatSender = {
  name: string | null;
  pseudonym: string | null;
};

export interface ChatRepository {
  findRecentGlobalMessages(limit: number): Promise<ChatHistoryMessage[]>;
  findSender(userId: string): Promise<ChatSender | null>;
  createGlobalMessage(userId: string, content: string): Promise<void>;
}
