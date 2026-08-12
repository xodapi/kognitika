export interface AnalyticsSessionOwnershipRepository {
  isOwnedBy(sessionId: string, userId: string): Promise<boolean>;
}
