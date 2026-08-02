# Database Migration Baseline

`20260701000000_baseline_schema` is the initial Prisma migration for fresh PostgreSQL databases. It creates the schema that existed before the incremental migrations committed on 2026-07-24 and later.

## Fresh Databases

Run the normal command:

```bash
pnpm exec prisma migrate deploy
```

The baseline and all incremental migrations apply in chronological order.

## Existing Databases

Do not run baseline SQL against an existing Kognitika database. Before `prisma migrate deploy`, the deployment workflow runs `scripts/check-migration-baseline.mjs` and classifies the database as follows:

- Empty database: no public tables, no `GameType` enum, and no `_prisma_migrations` table. The baseline applies normally.
- Compatible existing database: all baseline tables and `GameType` exist, migration history is the complete successful migration sequence, or that same sequence plus the one documented rolled-back baseline audit record described below.
- **Exact observed legacy recovery fingerprint**: all ten core tables exist; `GameType` has exactly 24 labels in historical order; `session_analytics_summaries` and `daily_practice_plans` are both absent; and `_prisma_migrations` has exactly five records:
  1. the three historic `GameType` migrations, each successful;
  2. one rolled-back `20260701000000_baseline_schema` record; and
  3. one successful/applied `20260701000000_baseline_schema` record.

  Only this exact fingerprint may continue to committed `20260725140000_reconcile_legacy_baseline_gap`.
- Missing migration history, an incomplete fingerprint, an extra record, a rolled-back record for any migration other than the baseline, multiple rolled-back records, unfinished migration, incomplete schema, or a gap in history stops deployment before DDL, build, or restart.

## Approved Legacy Schema Adoption Exception

`prisma migrate resolve --applied 20260701000000_baseline_schema` is permitted only as an explicitly approved operational exception for adoption of an already-existing legacy schema. It must be performed under an approved runbook after a verified backup and schema inspection. It records migration history only, and baseline SQL must **not** be physically run again.

The recorded recovery sequence first encountered a baseline failure because the existing `GameType` enum made baseline SQL invalid. Prisma then recorded that failed attempt with `migrate resolve --rolled-back`, followed by an applied baseline adoption record. Prisma 7.8.0 was verified in the isolated laboratory to retain both records, treat the successful baseline record as applied, and continue with reconciliation and later migrations. The rolled-back baseline record is audit history, not an instruction to rerun baseline SQL.

This repository preflight never performs adoption or modifies `_prisma_migrations`. It permits only the exact observed post-adoption fingerprint above. After preflight permits that fingerprint, Prisma applies the committed reconciliation migration. Its `IF NOT EXISTS` DDL creates the two missing baseline tables and indexes. Prisma then applies later committed migrations.

Post-deploy verification requires nine successful migration records plus the retained rolled-back baseline audit record, no unfinished records, the two recovered tables, their expected indexes, and `GameAttempt` from later migrations. The preflight intentionally rejects any other rolled-back record layout.

## Isolated Recovery Laboratory

Run the schema-only, synthetic local proof:

```powershell
./scripts/run-migration-recovery-lab.ps1
```

The laboratory starts an ephemeral PostgreSQL container and, only there:

1. creates the sanitized physical legacy schema without the two target tables;
2. records the three historic migrations, demonstrates the baseline SQL failure against the pre-existing enum, then records the failed baseline as rolled back and records the approved baseline adoption without re-running baseline SQL;
3. asserts the exact five-row observed metadata fingerprint and verifies preflight permits it;
4. verifies `prisma migrate status`, runs the full committed Prisma migration sequence, and asserts the final ten-row history and recovered schema;
5. verifies that the final Prisma status is up to date and the repository preflight is compatible;
6. verifies the separate fresh empty database path.

It reads no `.env`, contacts no server, and contains no application rows, user data, Brain ID, email, tokens, JWTs, or raw telemetry. Near-miss cases are covered by `src/tests/migration-baseline-state.test.ts` and remain fail-closed.

The production health check remains `https://kognitika.ru/api/health`.
