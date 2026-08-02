$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $root 'fixtures/migration-recovery-lab/docker-compose.yml'
$fixture = Join-Path $root 'fixtures/migration-recovery-lab/legacy-recovery.sql'
$project = 'kognitika-migration-recovery-lab'
$databaseUrl = 'postgresql://laboratory:laboratory@127.0.0.1:55432/laboratory?schema=public'

function Invoke-LabSql([string]$SqlFile) {
  for ($attempt = 1; $attempt -le 5; $attempt++) {
    Get-Content -Raw -LiteralPath $SqlFile | docker compose -p $project -f $composeFile exec -T db psql --set ON_ERROR_STOP=1 --username laboratory --dbname laboratory
    if ($LASTEXITCODE -eq 0) { return }
    if ($attempt -eq 5) { throw "Laboratory SQL failed: $SqlFile" }
    Start-Sleep -Seconds 2
  }
}

function Invoke-LabStatement([string]$Sql) {
  $Sql | docker compose -p $project -f $composeFile exec -T db psql --set ON_ERROR_STOP=1 --username laboratory --dbname laboratory
  if ($LASTEXITCODE -ne 0) { throw 'Laboratory assertion failed.' }
}

try {
  $env:LAB_ROOT = $root
  $env:DATABASE_URL = $databaseUrl
  $node = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source

  docker compose -p $project -f $composeFile down --volumes --remove-orphans
  docker compose -p $project -f $composeFile up --wait --quiet-pull
  if ($LASTEXITCODE -ne 0) { throw 'Could not start the isolated PostgreSQL laboratory.' }

  # Physical legacy schema only. The fixture does not create or edit migration history.
  Invoke-LabSql $fixture

  # Approved adoption exception: record the baseline without re-running baseline SQL,
  # then record the three historic GameType migrations in the isolated fixture only.
  & $node (Join-Path $root 'node_modules/prisma/build/index.js') migrate resolve --applied 20260701000000_baseline_schema
  if ($LASTEXITCODE -ne 0) { throw 'Isolated baseline adoption failed.' }
  foreach ($migration in @(
    '20260724180000_add_express_knowledge_game_types',
    '20260725120000_add_alphabet_table_game_type',
    '20260725130000_add_stroop_alphabet_game_type'
  )) {
    & $node (Join-Path $root 'node_modules/prisma/build/index.js') migrate resolve --applied $migration
    if ($LASTEXITCODE -ne 0) { throw "Isolated historic migration adoption failed: $migration" }
  }

  # Exact adopted fingerprint is the only legacy state preflight permits.
  & $node (Join-Path $root 'scripts/check-migration-baseline.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Exact approved recovery fingerprint was not permitted.' }

  # Prisma applies the committed reconciliation and all subsequent migrations.
  & $node (Join-Path $root 'node_modules/prisma/build/index.js') migrate deploy
  if ($LASTEXITCODE -ne 0) { throw 'Approved recovery migration sequence failed.' }

  Invoke-LabStatement @'
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL) <> 9 THEN
    RAISE EXCEPTION 'Expected full successful migration history after reconciliation';
  END IF;
  IF EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "rolled_back_at" IS NOT NULL OR "finished_at" IS NULL) THEN
    RAISE EXCEPTION 'Post-deploy migration history must contain no rolled-back or unfinished records';
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

  & $node (Join-Path $root 'scripts/check-migration-baseline.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Post-deploy schema and history were not compatible.' }

  # A distinct fresh database remains able to use the ordinary Prisma sequence.
  Invoke-LabStatement @'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
'@
  & $node (Join-Path $root 'node_modules/prisma/build/index.js') migrate deploy
  if ($LASTEXITCODE -ne 0) { throw 'Fresh Prisma migration path failed in the isolated laboratory.' }
  Invoke-LabStatement @'
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL) <> 9 THEN
    RAISE EXCEPTION 'Fresh Prisma migration history is not complete';
  END IF;
END $$;
'@

  Write-Host 'Recovery laboratory completed: exact approved adoption reconciles, later migrations apply, and near-miss checks remain fail-closed.'
} finally {
  docker compose -p $project -f $composeFile down --volumes --remove-orphans
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:LAB_ROOT -ErrorAction SilentlyContinue
}
