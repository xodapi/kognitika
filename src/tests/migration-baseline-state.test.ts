import { describe, expect, it } from 'vitest';
import {
  CORE_TABLES,
  EXPECTED_GAME_TYPES,
  LEGACY_MIGRATIONS,
  RECONCILIATION_MIGRATION,
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
const successful = (migration_name: string): MigrationRecord => ({ migration_name, finished_at: new Date('2026-07-25T00:00:00.000Z'), rolled_back_at: null });
const rolledBack = (migration_name: string): MigrationRecord => ({ migration_name, finished_at: null, rolled_back_at: new Date('2026-07-25T00:00:00.000Z') });

function fixtureClient(fixture: Fixture = {}) {
  const tables = fixture.tables ?? [...CORE_TABLES];
  return {
    query: async (query: string) => {
      if (query.includes('tableCount')) {
        return { rows: [{ tableCount: tables.length, hasMigrationTable: fixture.hasMigrationTable ?? true, hasGameType: fixture.gameType ?? true }] };
      }
      if (query.includes('SELECT tablename')) {
        return { rows: tables.map((tablename) => ({ tablename })) };
      }
      if (query.includes('SELECT migration_name')) {
        return { rows: fixture.migrations ?? LEGACY_MIGRATIONS.map(successful) };
      }
      if (query.includes('SELECT enumlabel')) {
        return { rows: (fixture.gameTypes ?? EXPECTED_GAME_TYPES).map((enumlabel) => ({ enumlabel })) };
      }
      throw new Error(`Unexpected query: ${query}`);
    },
  };
}

describe('isolated legacy recovery laboratory preflight', () => {
  it('classifies the exact sanitized legacy restore as blocked, because Prisma cannot reconcile its history deterministically', async () => {
    await expect(inspectMigrationBaseline(fixtureClient() as never)).resolves.toMatchObject({
      kind: 'invalid',
      code: 16,
      reason: expect.stringContaining('cannot be reconciled deterministically'),
    });
  });

  it('requires all 24 GameType values in historical order', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      gameTypes: ['SCHULTE_GORBOV', 'SCHULTE', ...EXPECTED_GAME_TYPES.slice(2)],
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });

  it('rejects a restore where one target table already exists', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      tables: [...CORE_TABLES, 'daily_practice_plans'],
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });

  it('rejects a restore with a missing core table', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      tables: CORE_TABLES.slice(1),
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });

  it('rejects an incomplete enum', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      gameTypes: EXPECTED_GAME_TYPES.slice(0, -1),
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });

  it('rejects an extra migration record', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      migrations: [...LEGACY_MIGRATIONS.map(successful), successful('unexpected_migration')],
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });

  it('rejects an unfinished migration', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      migrations: [...LEGACY_MIGRATIONS.map(successful), { migration_name: RECONCILIATION_MIGRATION, finished_at: null, rolled_back_at: null }],
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 12 });
  });

  it('rejects the documented rolled-back baseline attempt and resolved baseline record', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      migrations: [
        ...LEGACY_MIGRATIONS.map(successful),
        rolledBack('20260701000000_baseline_schema'),
        successful('20260701000000_baseline_schema'),
      ],
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 13 });
  });

  it('accepts a fresh empty database for the normal migration path', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      tables: [], gameType: false, hasMigrationTable: false, migrations: [],
    }) as never)).resolves.toEqual({ kind: 'empty' });
  });
});
