type QueryResult<Row extends object = Record<string, unknown>> = {
  rows: Row[];
};

export const BASELINE_MIGRATION: string;
export const LEGACY_MIGRATIONS: string[];
export const RECONCILIATION_MIGRATION: string;
export const MIGRATION_ORDER: string[];
export const CORE_TABLES: string[];
export const MISSING_BASELINE_TABLES: string[];
export const EXPECTED_GAME_TYPES: string[];

export type MigrationBaselineResult =
  | { kind: 'empty' }
  | { kind: 'compatible' }
  | { kind: 'legacy-reconciliation-required' }
  | { kind: 'invalid'; code: number; reason: string };

export type MigrationBaselineClient = {
  query: (text: string, values?: unknown[]) => Promise<QueryResult>;
};

export function inspectMigrationBaseline(
  client: MigrationBaselineClient,
): Promise<MigrationBaselineResult>;

export function withDatabaseUrl<T>(
  callback: (client: MigrationBaselineClient) => Promise<T>,
): Promise<T>;
