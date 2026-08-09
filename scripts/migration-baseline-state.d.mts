export const BASELINE_MIGRATION: string;
export const LEGACY_MIGRATIONS: string[];
export const RECONCILIATION_MIGRATION: string;
export const MIGRATION_ORDER: string[];
export const CORE_TABLES: string[];
export const MISSING_BASELINE_TABLES: string[];
export const EXPECTED_GAME_TYPES: string[];

export type MigrationBaselineState =
  | { kind: 'empty' }
  | { kind: 'compatible' }
  | { kind: 'legacy-reconciliation-required' }
  | { kind: 'invalid'; code: number; reason: string };

/** Minimal surface `inspectMigrationBaseline` requires from a `pg` client. */
export interface MigrationBaselineQueryClient {
  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export function inspectMigrationBaseline(
  client: MigrationBaselineQueryClient,
): Promise<MigrationBaselineState>;

export function withDatabaseUrl<T>(
  callback: (client: MigrationBaselineQueryClient) => Promise<T>,
): Promise<T>;
