export interface AdminAuthorizationRepository {
  findRole(userId: string): Promise<string | null>;
}
