$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $root 'fixtures/migration-recovery-lab/docker-compose.yml'
$fixture = Join-Path $root 'fixtures/migration-recovery-lab/legacy-recovery.sql'
$project = 'kognitika-migration-recovery-lab'

function Invoke-LabSql([string]$SqlFile) {
  for ($attempt = 1; $attempt -le 5; $attempt++) {
    Get-Content -Raw -LiteralPath $SqlFile | docker compose -p $project -f $composeFile exec -T db psql --set ON_ERROR_STOP=1 --username laboratory --dbname laboratory
    if ($LASTEXITCODE -eq 0) { return }
    if ($attempt -eq 5) { throw "Laboratory SQL failed: $SqlFile" }
    Start-Sleep -Seconds 2
  }
}

try {
  $env:LAB_ROOT = $root
  # Remove a previous interrupted laboratory run before creating the fixture.
  docker compose -p $project -f $composeFile down --volumes --remove-orphans
  docker compose -p $project -f $composeFile up --wait --quiet-pull
  if ($LASTEXITCODE -ne 0) { throw 'Could not start the isolated PostgreSQL laboratory.' }

  Invoke-LabSql $fixture

  # Assert the exact, intentionally unreconcilable history before any recovery
  # DDL. The unit suite exercises the same fingerprint through the JS preflight.
  @'
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "_prisma_migrations") <> 5
    OR (SELECT COUNT(*) FROM "_prisma_migrations" WHERE "rolled_back_at" IS NOT NULL) <> 1
    OR (SELECT COUNT(*) FROM "_prisma_migrations" WHERE "migration_name" = '20260701000000_baseline_schema' AND "finished_at" IS NOT NULL) <> 1 THEN
    RAISE EXCEPTION 'Expected blocked legacy migration-history fixture was not loaded';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public'
      AND tablename IN ('session_analytics_summaries', 'daily_practice_plans')) THEN
    RAISE EXCEPTION 'Legacy fixture must not include baseline-gap tables';
  END IF;
END $$;
'@ | docker compose -p $project -f $composeFile exec -T db psql --set ON_ERROR_STOP=1 --username laboratory --dbname laboratory
  if ($LASTEXITCODE -ne 0) { throw 'Legacy fixture did not match the expected blocked fingerprint.' }

  Invoke-LabSql (Join-Path $root 'prisma/migrations/20260725140000_reconcile_legacy_baseline_gap/migration.sql')
  Invoke-LabSql (Join-Path $root 'prisma/migrations/20260731120000_add_analytics_summary_ownership/migration.sql')
  Invoke-LabSql (Join-Path $root 'prisma/migrations/20260731130000_add_game_save_idempotency/migration.sql')
  Invoke-LabSql (Join-Path $root 'prisma/migrations/20260731140000_add_game_attempt_lifecycle/migration.sql')
  Invoke-LabSql (Join-Path $root 'prisma/migrations/20260731150000_remove_legacy_email_identity/migration.sql')

  @'
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'
      AND tablename IN ('session_analytics_summaries', 'daily_practice_plans', 'GameAttempt')) <> 3 THEN
    RAISE EXCEPTION 'Expected isolated recovery tables were not created';
  END IF;
  IF (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'
      AND indexname IN ('session_analytics_summaries_jobId_key', 'daily_practice_plans_userId_date_key', 'GameAttempt_userId_clientRunId_key')) <> 3 THEN
    RAISE EXCEPTION 'Expected isolated recovery indexes were not created';
  END IF;
END $$;
'@ | docker compose -p $project -f $composeFile exec -T db psql --set ON_ERROR_STOP=1 --username laboratory --dbname laboratory
  if ($LASTEXITCODE -ne 0) { throw 'Could not verify isolated recovery schema.' }

  # A separate fresh database path must remain migratable through Prisma itself.
  @'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
'@ | docker compose -p $project -f $composeFile exec -T db psql --set ON_ERROR_STOP=1 --username laboratory --dbname laboratory
  if ($LASTEXITCODE -ne 0) { throw 'Could not reset the isolated database for the fresh migration test.' }

  $env:DATABASE_URL = 'postgresql://laboratory:laboratory@127.0.0.1:55432/laboratory?schema=public'
  $node = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
  & $node (Join-Path $root 'node_modules/prisma/build/index.js') migrate deploy
  if ($LASTEXITCODE -ne 0) { throw 'Fresh Prisma migration path failed in the isolated laboratory.' }

  @'
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL) <> 9 THEN
    RAISE EXCEPTION 'Fresh Prisma migration history is not a complete successful prefix';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'GameAttempt') THEN
    RAISE EXCEPTION 'Fresh Prisma migration path did not create GameAttempt';
  END IF;
END $$;
'@ | docker compose -p $project -f $composeFile exec -T db psql --set ON_ERROR_STOP=1 --username laboratory --dbname laboratory
  if ($LASTEXITCODE -ne 0) { throw 'Could not verify the fresh Prisma migration path.' }

  Write-Host 'Recovery laboratory completed: committed SQL changes schema, Prisma history remains safely blocked for legacy state, and a fresh database migrates normally.'
} finally {
  # LAB_ROOT must remain available while Compose resolves the bind mount.
  docker compose -p $project -f $composeFile down --volumes --remove-orphans
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:LAB_ROOT -ErrorAction SilentlyContinue
}
