import { describe, expect, it } from 'vitest';
import { inspectMigrationBaseline, LEGACY_MIGRATIONS } from '../../scripts/migration-baseline-state.mjs';

const coreTables = [
  'User', 'XpEvent', 'LeaderboardEntry', 'Feedback', 'GameSession',
  'Idea', 'IdeaVote', 'Achievement', 'UserAchievement', 'Message',
];
const gameTypes = [
  'SCHULTE', 'SCHULTE_GORBOV', 'NUMERICAL_ANALYSIS', 'LOGICAL_SEQUENCE',
  'SITUATIONAL_JUDGMENT', 'STROOP', 'N_BACK', 'OBJECTIVE_FILTER',
  'PROFILING_RICE', 'ANOMALY_DETECTOR', 'DIALOGUE_2_1', 'SPEED_TYPING',
  'SPATIAL_CONCEALMENT', 'TOPOLOGY_MEMORY', 'COLLISION_DETECTOR',
  'ASYNC_DISPATCHER', 'NOISE_REDUCTION', 'LANGUAGE_SCANNER', 'DECRYPTOR',
  'REALITY_CHECK', 'MENTAL_MATH', 'SCHULTE_90', 'ALPHABET_TABLE',
  'STROOP_ALPHABET',
];

type Fixture = {
  tables?: string[];
  migrations?: Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>;
  gameType?: boolean;
  gameTypes?: string[];
};

function fixtureClient(fixture: Fixture = {}) {
  const tables = fixture.tables ?? [...coreTables];
  return {
    query: async (query: string) => {
      if (query.includes('tableCount')) {
        return { rows: [{ tableCount: tables.length, hasMigrationTable: true, hasGameType: fixture.gameType ?? true }] };
      }
      if (query.includes('SELECT tablename')) {
        return { rows: tables.map((tablename) => ({ tablename })) };
      }
      if (query.includes('SELECT migration_name')) {
        return { rows: fixture.migrations ?? LEGACY_MIGRATIONS.map((migration_name) => ({ migration_name, finished_at: new Date(), rolled_back_at: null })) };
      }
      if (query.includes('SELECT enumlabel')) {
        return { rows: (fixture.gameTypes ?? gameTypes).map((enumlabel) => ({ enumlabel })) };
      }
      throw new Error(`Unexpected query: ${query}`);
    },
  };
}

describe('migration baseline legacy reconciliation guard', () => {
  it('permits only the confirmed legacy fingerprint', async () => {
    await expect(inspectMigrationBaseline(fixtureClient() as never)).resolves.toEqual({ kind: 'legacy-reconciliation-required' });
  });

  it('rejects a partial missing-baseline schema', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      tables: [...coreTables, 'daily_practice_plans'],
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });

  it('allows the continuous history after reconciliation without baseline history', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      tables: [...coreTables, 'session_analytics_summaries', 'daily_practice_plans'],
      migrations: [
        ...LEGACY_MIGRATIONS,
        '20260725140000_reconcile_legacy_baseline_gap',
      ].map((migration_name) => ({ migration_name, finished_at: new Date(), rolled_back_at: null })),
    }) as never)).resolves.toEqual({ kind: 'compatible' });
  });

  it('rejects an unexpected applied migration record', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({
      migrations: [
        ...LEGACY_MIGRATIONS.map((migration_name) => ({ migration_name, finished_at: new Date(), rolled_back_at: null })),
        { migration_name: 'unexpected', finished_at: new Date(), rolled_back_at: null },
      ],
    }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });

  it('rejects a legacy fingerprint with missing enum values', async () => {
    await expect(inspectMigrationBaseline(fixtureClient({ gameTypes: gameTypes.slice(0, -1) }) as never)).resolves.toMatchObject({ kind: 'invalid', code: 11 });
  });
});
