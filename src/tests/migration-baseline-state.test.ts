import { describe, expect, it } from 'vitest';
import {
  BASELINE_MIGRATION,
  CORE_TABLES,
  EXPECTED_GAME_TYPES,
  LEGACY_MIGRATIONS,
  RECONCILIATION_MIGRATION,
  MIGRATION_ORDER,
  inspectMigrationBaseline,
} from '../../scripts/migration-baseline-state.mjs';

type MigrationRecord = {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

type Fixture = {
  tables?: string[];
  migrations?: MigrationRecord[];
  gameType?: boolean;
  gameTypes?: string[];
  hasMigrationTable?: boolean;
};

const missingBaselineTables = ['session_analytics_summaries', 'daily_practice_plans'];
const successful = (migration_name: string): MigrationRecord => ({
  migration_name,
  finished_at: new Date('2026-07-25T00:00:00.000Z'),
  rolled_back_at: null,
});
const rolledBack = (migration_name: string): MigrationRecord => ({
  migration_name,
  finished_at: null,
  rolled_back_at: new Date('2026-07-25T00:00:00.000Z'),
});
const approvedAppliedHistory = [BASELINE_MIGRATION, ...LEGACY_MIGRATIONS].map(successful);
const exactRecoveryHistory = [...LEGACY_MIGRATIONS.map(successful), rolledBack(BASELINE_MIGRATION), successful(BASELINE_MIGRATION)];

function fixtureClient(fixture: Fixture = {}) {
  const tables = fixture.tables ?? [...CORE_TABLES];
  return {
    query: async (query: string) => {
      if (query.includes('tableCount')) {
        return {
          rows: [{
            tableCount: tables.length,
            hasMigrationTable: fixture.hasMigrationTable ?? true,
            hasGameType: fixture.gameType ?? true,
          }],
        };
      }
      if (query.includes('SELECT tablename')) {
        return { rows: tables.map((tablename) => ({ tablename })) };
      }
      if (query.includes('SELECT migration_name')) {
        return { rows: fixture.migrations ?? exactRecoveryHistory };
      }
      if (query.includes('SELECT enumlabel')) {
        return { rows: (fixture.gameTypes ?? EXPECTED_GAME_TYPES).map((enumlabel) => ({ enumlabel })) };
      }
      throw new Error(`Unexpected query: ${query}`);
    },
  };
}

describe('approved legacy recovery preflight', () => {
  it('permits the exact observed rolled-back-plus-applied baseline fingerprint', async () => {
    await expect(inspectMigrationBaseline(fixtureClient() as never)).resolves.toEqual({ kind: 'legacy-reconciliation-required' });
  });

  it('requires all 24 GameType values in historical order', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      gameTypes: ['SCHULTE_GORBOV', 'SCHULTE', ...EXPECTED_GAME_TYPES.slice(2)],
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });

  it('rejects a recovery state where one target table already exists', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      tables: [...CORE_TABLES, 'daily_practice_plans'],
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });

  it('rejects a recovery state with a missing core table', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      tables: CORE_TABLES.slice(1),
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });

  it('rejects an incomplete enum', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      gameTypes: EXPECTED_GAME_TYPES.slice(0, -1),
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });

  it('rejects a recovery state without the rolled-back baseline record', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      migrations: approvedAppliedHistory,
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });

  it('rejects an extra migration record', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      migrations: [...exactRecoveryHistory, successful('unexpected_migration')],
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });

  it('rejects an unfinished migration', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      migrations: [...exactRecoveryHistory, { migration_name: RECONCILIATION_MIGRATION, finished_at: null, rolled_back_at: null }],
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 12 });
  });

  it('rejects a rolled-back record for a migration other than the baseline', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      migrations: [...approvedAppliedHistory, rolledBack(RECONCILIATION_MIGRATION)],
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 13 });
  });

  it('rejects multiple rolled-back baseline records', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      migrations: [...exactRecoveryHistory, rolledBack(BASELINE_MIGRATION)],
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 13 });
  });

  it('accepts the full migrated history while retaining the exact rolled-back baseline audit record', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      tables: [...CORE_TABLES, ...missingBaselineTables, 'GameAttempt'],
      migrations: [...MIGRATION_ORDER.map(successful), rolledBack(BASELINE_MIGRATION)],
    }) as never)).resolves.toEqual({ kind: 'compatible' });
  });

  it('accepts a fresh empty database for the normal migration path', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      tables: [], gameType: false, hasMigrationTable: false, migrations: [],
    }) as never)).resolves.toEqual({ kind: 'empty' });
  });
});
