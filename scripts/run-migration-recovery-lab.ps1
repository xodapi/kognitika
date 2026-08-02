$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $root 'fixtures/migration-recovery-lab/docker-compose.yml'
$project = 'kognitika-migration-recovery-lab'
$databaseUrl = 'postgresql://laboratory:laboratory@127.0.0.1:55432/laboratory?schema=public'

function Invoke-LabSql([string]$Sql) {
  for ($attempt = 1; $attempt -le 5; $attempt++) {
    $Sql | docker compose -p $project -f $composeFile exec -T db psql --set ON_ERROR_STOP=1 --username laboratory --dbname laboratory
    if ($LASTEXITCODE -eq 0) { return }
    if ($attempt -eq 5) { throw 'Laboratory SQL failed.' }
    Start-Sleep -Seconds 2
  }
}

function Invoke-LabSqlFile([string]$SqlFile) {
  Invoke-LabSql (Get-Content -Raw -LiteralPath $SqlFile)
}

function Invoke-Prisma([string[]]$Arguments, [string]$FailureMessage) {
  & $node (Join-Path $root 'node_modules/prisma/build/index.js') @Arguments
  if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
}

try {
  $env:LAB_ROOT = $root
  $env:DATABASE_URL = $databaseUrl
  $node = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source

  docker compose -p $project -f $composeFile down --volumes --remove-orphans
  docker compose -p $project -f $composeFile up --wait --quiet-pull
  if ($LASTEXITCODE -ne 0) { throw 'Could not start the isolated PostgreSQL laboratory.' }

  # Synthetic physical legacy schema only. No application rows or migration records exist yet.
  Invoke-LabSqlFile (Join-Path $root 'fixtures/migration-recovery-lab/legacy-recovery.sql')

  # Historic migrations are known to have changed only GameType enum labels. Record them
  # before reproducing the observed failed baseline attempt in this disposable database.
  foreach ($migration in @(
    '20260724180000_add_express_knowledge_game_types',
    '20260725120000_add_alphabet_table_game_type',
    '20260725130000_add_stroop_alphabet_game_type'
  )) {
    Invoke-Prisma @('migrate', 'resolve', '--applied', $migration) "Could not record historic migration: $migration"
  }

  # This must fail because GameType already exists. It demonstrates that baseline SQL is
  # not a valid operation against the physical legacy schema.
  & $node (Join-Path $root 'node_modules/prisma/build/index.js') migrate deploy
  if ($LASTEXITCODE -eq 0) { throw 'Expected baseline SQL to fail against the legacy GameType enum.' }

  # Reproduce the observed Prisma recovery metadata without rerunning baseline SQL.
  Invoke-Prisma @('migrate', 'resolve', '--rolled-back', '20260701000000_baseline_schema') 'Could not record failed baseline as rolled back.'
  Invoke-Prisma @('migrate', 'resolve', '--applied', '20260701000000_baseline_schema') 'Could not record baseline adoption.'

  Invoke-LabSql @'
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "_prisma_migrations") <> 5
    OR (SELECT COUNT(*) FROM "_prisma_migrations" WHERE "migration_name" = '20260701000000_baseline_schema' AND "rolled_back_at" IS NOT NULL AND "finished_at" IS NULL) <> 1
    OR (SELECT COUNT(*) FROM "_prisma_migrations" WHERE "migration_name" = '20260701000000_baseline_schema' AND "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL) <> 1
    OR (SELECT COUNT(*) FROM "_prisma_migrations" WHERE "migration_name" IN ('20260724180000_add_express_knowledge_game_types', '20260725120000_add_alphabet_table_game_type', '20260725130000_add_stroop_alphabet_game_type') AND "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL) <> 3 THEN
    RAISE EXCEPTION 'Expected exact observed legacy migration metadata was not reproduced';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('session_analytics_summaries', 'daily_practice_plans')) THEN
    RAISE EXCEPTION 'Legacy fixture must not include baseline-gap tables';
  END IF;
END $$;
'@

  # Prisma migrate status exits 1 while it reports pending migrations. Its output
  # must be produced successfully, then the repository preflight permits this exact state.
  & $node (Join-Path $root 'node_modules/prisma/build/index.js') migrate status
  if ($LASTEXITCODE -ne 1) { throw 'Prisma did not report the expected pending migrations.' }
  & $node (Join-Path $root 'scripts/check-migration-baseline.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Exact observed recovery fingerprint was not permitted.' }

  Invoke-Prisma @('migrate', 'deploy') 'Recovery migration sequence failed.'

  Invoke-LabSql @'
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "_prisma_migrations") <> 10
    OR (SELECT COUNT(*) FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL) <> 9
    OR (SELECT COUNT(*) FROM "_prisma_migrations" WHERE "migration_name" = '20260701000000_baseline_schema' AND "rolled_back_at" IS NOT NULL AND "finished_at" IS NULL) <> 1 THEN
    RAISE EXCEPTION 'Expected successful migration sequence plus retained baseline audit record';
  END IF;
  IF EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL) THEN
    RAISE EXCEPTION 'Post-deploy migration history must contain no unfinished records';
  END IF;
  IF (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'
      AND tablename IN ('session_analytics_summaries', 'daily_practice_plans', 'GameAttempt')) <> 3 THEN
    RAISE EXCEPTION 'Expected recovery and later-migration tables were not created';
  END IF;
  IF (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'
      AND indexname IN ('session_analytics_summaries_jobId_key', 'daily_practice_plans_userId_date_key', 'GameAttempt_userId_clientRunId_key')) <> 3 THEN
    RAISE EXCEPTION 'Expected recovery and later-migration indexes were not created';
  END IF;
END $$;
'@

  Invoke-Prisma @('migrate', 'status') 'Prisma did not report the reconciled database up to date.'
  & $node (Join-Path $root 'scripts/check-migration-baseline.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Post-deploy schema and history were not compatible.' }

  # A distinct fresh database remains able to apply the ordinary full migration sequence.
  Invoke-LabSql @'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
'@
  Invoke-Prisma @('migrate', 'deploy') 'Fresh Prisma migration path failed in the isolated laboratory.'
  Invoke-LabSql @'
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL) <> 9
    OR EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "rolled_back_at" IS NOT NULL OR "finished_at" IS NULL) THEN
    RAISE EXCEPTION 'Fresh Prisma migration history is not a complete successful sequence';
  END IF;
END $$;
'@

  Write-Host 'Recovery laboratory completed: exact observed Prisma metadata reconciles, later migrations apply, and near-miss checks remain fail-closed.'
} finally {
  docker compose -p $project -f $composeFile down --volumes --remove-orphans
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:LAB_ROOT -ErrorAction SilentlyContinue
}
