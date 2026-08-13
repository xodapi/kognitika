export type NotificationRecipient = {
  name: string | null;
  pseudonym: string | null;
};

export interface NotificationRecipientRepository {
  findByUserId(userId: string): Promise<NotificationRecipient | null>;
}
