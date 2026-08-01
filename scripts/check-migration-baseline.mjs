import pg from 'pg';

const BASELINE_MIGRATION = '20260701000000_baseline_schema';
const databaseUrl = process.env.DATABASE_URL;
const EXPECTED_TABLES = [
  'User',
  'XpEvent',
  'LeaderboardEntry',
  'Feedback',
  'GameSession',
  'Idea',
  'IdeaVote',
  'Achievement',
  'UserAchievement',
  'Message',
  'session_analytics_summaries',
  'daily_practice_plans',
];
const MIGRATION_ORDER = [
  BASELINE_MIGRATION,
  '20260724180000_add_express_knowledge_game_types',
  '20260725120000_add_alphabet_table_game_type',
  '20260725130000_add_stroop_alphabet_game_type',
  '20260731120000_add_analytics_summary_ownership',
  '20260731130000_add_game_save_idempotency',
  '20260731140000_add_game_attempt_lifecycle',
  '20260731150000_remove_legacy_email_identity',
];

function fail(message, code) {
  console.error(`[migration-baseline] ${message}`);
  process.exitCode = code;
}

if (!databaseUrl) {
  fail('DATABASE_URL is required to check migration baseline state.', 2);
} else {
  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    const [{ tableCount, hasMigrationTable, hasGameType }] = (await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM pg_tables WHERE schemaname = 'public') AS "tableCount",
        to_regclass('public."_prisma_migrations"') IS NOT NULL AS "hasMigrationTable",
        EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GameType') AS "hasGameType"
    `)).rows;

    if (tableCount === 0 && !hasMigrationTable && !hasGameType) {
      console.log('[migration-baseline] Empty database detected; baseline migration will be applied normally.');
    } else {
      const { rows: tableRows } = await client.query(
        'SELECT tablename FROM pg_tables WHERE schemaname = $1',
        ['public'],
      );
      const tableNames = new Set(tableRows.map((row) => row.tablename));
      const missingTables = EXPECTED_TABLES.filter((table) => !tableNames.has(table));

      if (!hasMigrationTable) {
        fail(
          'Existing database has application objects but no Prisma migration history. Stop deployment and reconcile with a reviewed migration plan before continuing.',
          10,
        );
      } else if (!hasGameType || missingTables.length > 0) {
        fail(
          `Existing database schema is incomplete or incompatible (missing enum or tables: ${missingTables.join(', ') || 'none'}). Stop deployment before DDL.`,
          11,
        );
      } else {
        const { rows: migrationRows } = await client.query(`
          SELECT migration_name, finished_at, rolled_back_at
          FROM "_prisma_migrations"
        `);
        const applied = new Set(
          migrationRows
            .filter((row) => row.finished_at !== null && row.rolled_back_at === null)
            .map((row) => row.migration_name),
        );
        const failed = migrationRows.filter((row) => row.finished_at === null && row.rolled_back_at === null);
        const rolledBack = migrationRows.filter((row) => row.rolled_back_at !== null);
        const firstMissing = MIGRATION_ORDER.findIndex((migration) => !applied.has(migration));
        const skippedMigration = firstMissing === -1
          ? undefined
          : MIGRATION_ORDER.slice(firstMissing + 1).find((migration) => applied.has(migration));

        if (failed.length > 0) {
          fail('Migration history contains unfinished migrations. Resolve the recorded failure before deploying.', 12);
        } else if (rolledBack.length > 0) {
          fail('Migration history contains rolled-back migrations. Reconcile history before deploying.', 13);
        } else if (!applied.has(BASELINE_MIGRATION)) {
          fail(
            `Existing schema is missing baseline history. After backup, approval, and schema review, run: pnpm exec prisma migrate resolve --applied ${BASELINE_MIGRATION}`,
            14,
          );
        } else if (skippedMigration) {
          fail(
            `Migration history has a gap before ${skippedMigration}. Stop deployment and reconcile history before continuing.`,
            15,
          );
        } else {
          console.log('[migration-baseline] Existing schema and migration history are compatible; pending migrations may apply normally.');
        }
      }
    }
  } catch (error) {
    if (!process.exitCode) {
      fail(`Could not verify migration baseline: ${error instanceof Error ? error.message : 'unknown error'}`, 20);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}
