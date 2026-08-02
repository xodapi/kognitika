import pg from 'pg';

export const BASELINE_MIGRATION = '20260701000000_baseline_schema';
export const LEGACY_MIGRATIONS = [
  '20260724180000_add_express_knowledge_game_types',
  '20260725120000_add_alphabet_table_game_type',
  '20260725130000_add_stroop_alphabet_game_type',
];
export const RECONCILIATION_MIGRATION = '20260725140000_reconcile_legacy_baseline_gap';
export const MIGRATION_ORDER = [
  BASELINE_MIGRATION,
  ...LEGACY_MIGRATIONS,
  RECONCILIATION_MIGRATION,
  '20260731120000_add_analytics_summary_ownership',
  '20260731130000_add_game_save_idempotency',
  '20260731140000_add_game_attempt_lifecycle',
  '20260731150000_remove_legacy_email_identity',
];

export const CORE_TABLES = [
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
];
export const MISSING_BASELINE_TABLES = [
  'session_analytics_summaries', 'daily_practice_plans'];
export const EXPECTED_GAME_TYPES = [
  'SCHULTE', 'SCHULTE_GORBOV', 'NUMERICAL_ANALYSIS', 'LOGICAL_SEQUENCE',
  'SITUATIONAL_JUDGMENT', 'STROOP', 'N_BACK', 'OBJECTIVE_FILTER',
  'PROFILING_RICE', 'ANOMALY_DETECTOR', 'DIALOGUE_2_1', 'SPEED_TYPING',
  'SPATIAL_CONCEALMENT', 'TOPOLOGY_MEMORY', 'COLLISION_DETECTOR',
  'ASYNC_DISPATCHER', 'NOISE_REDUCTION', 'LANGUAGE_SCANNER', 'DECRYPTOR',
  'REALITY_CHECK', 'MENTAL_MATH', 'SCHULTE_90', 'ALPHABET_TABLE',
  'STROOP_ALPHABET',
];

export async function inspectMigrationBaseline(client) {
  const [{ tableCount, hasMigrationTable, hasGameType }] = (await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM pg_tables WHERE schemaname = 'public') AS "tableCount",
      to_regclass('public."_prisma_migrations"') IS NOT NULL AS "hasMigrationTable",
      EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GameType') AS "hasGameType"
  `)).rows;

  if (tableCount === 0 && !hasMigrationTable && !hasGameType) {
    return { kind: 'empty' };
  }
  if (!hasMigrationTable) {
    return { kind: 'invalid', code: 10, reason: 'Existing database has application objects but no Prisma migration history.' };
  }

  const { rows: tableRows } = await client.query(
    'SELECT tablename FROM pg_tables WHERE schemaname = $1', ['public'],
  );
  const tableNames = new Set(tableRows.map((row) => row.tablename));
  const missingCoreTables = CORE_TABLES.filter((table) => !tableNames.has(table));
  const missingBaselineTables = MISSING_BASELINE_TABLES.filter((table) => !tableNames.has(table));

  const { rows: migrationRows } = await client.query(`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
  `);
  const failed = migrationRows.filter((row) => row.finished_at === null && row.rolled_back_at === null);
  const rolledBack = migrationRows.filter((row) => row.rolled_back_at !== null);
  const applied = migrationRows
    .filter((row) => row.finished_at !== null && row.rolled_back_at === null)
    .map((row) => row.migration_name);
  const appliedSet = new Set(applied);

  if (failed.length > 0) {
    return { kind: 'invalid', code: 12, reason: 'Migration history contains unfinished migrations.' };
  }
  if (rolledBack.length > 0) {
    return { kind: 'invalid', code: 13, reason: 'Migration history contains rolled-back migrations.' };
  }

  const legacyReconciliationOrder = MIGRATION_ORDER.slice(1);
  const isExactPrefix = (order) => applied.length <= order.length
    && order.slice(0, applied.length).every((migration) => appliedSet.has(migration));
  const reconciledLegacyHistory = appliedSet.has(RECONCILIATION_MIGRATION)
    && isExactPrefix(legacyReconciliationOrder);
  const baselineHistory = appliedSet.has(BASELINE_MIGRATION)
    && isExactPrefix(MIGRATION_ORDER);

  const approvedRecoveryHistory = applied.length === LEGACY_MIGRATIONS.length + 1
    && appliedSet.has(BASELINE_MIGRATION)
    && isExactPrefix([BASELINE_MIGRATION, ...LEGACY_MIGRATIONS]);
  const approvedRecoveryCandidate = approvedRecoveryHistory
    && hasGameType
    && missingCoreTables.length === 0
    && missingBaselineTables.length === MISSING_BASELINE_TABLES.length;

  if (approvedRecoveryCandidate) {
    const { rows: enumRows } = await client.query(`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
      WHERE pg_type.typname = 'GameType'
      ORDER BY enumsortorder
    `);
    const enumLabels = enumRows.map((row) => row.enumlabel);
    const enumMatches = enumLabels.length === EXPECTED_GAME_TYPES.length
      && EXPECTED_GAME_TYPES.every((label, index) => enumLabels[index] === label);
    if (enumMatches) {
      return { kind: 'legacy-reconciliation-required' };
    }
  }

  if (!hasGameType || missingCoreTables.length > 0 || missingBaselineTables.length > 0) {
    return {
      kind: 'invalid',
      code: 11,
      reason: `Existing database schema is incomplete or incompatible (missing enum or tables: ${[...missingCoreTables, ...missingBaselineTables].join(', ') || 'none'}).`,
    };
  }
  if (!appliedSet.has(BASELINE_MIGRATION) && !reconciledLegacyHistory) {
    return { kind: 'invalid', code: 14, reason: 'Existing schema is missing baseline history or a complete reviewed reconciliation history.' };
  }
  if (!baselineHistory && !reconciledLegacyHistory) {
    return { kind: 'invalid', code: 15, reason: 'Migration history is not a continuous successful prefix.' };
  }

  return { kind: 'compatible' };
}

export async function withDatabaseUrl(callback) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to check migration baseline state.');
  }
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}
