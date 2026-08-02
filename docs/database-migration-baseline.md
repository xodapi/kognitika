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
- Compatible existing database: all baseline tables and `GameType` exist, the baseline is recorded as applied, and migration history is a continuous successful prefix. Pending later migrations may then apply normally.
- **Exact approved legacy recovery fingerprint**: the baseline and exactly the three historic `GameType` migrations are successfully applied, all ten core tables exist, all 24 `GameType` labels exist in historical order, and both `session_analytics_summaries` and `daily_practice_plans` are absent. Only this fingerprint may continue to the committed `20260725140000_reconcile_legacy_baseline_gap` migration.
- Missing migration history, an incomplete fingerprint, an extra record, missing baseline history, incomplete schema, rolled-back migration, unfinished migration, or a gap in history: deployment stops before DDL, build, or restart.

## Approved Legacy Schema Adoption Exception

`prisma migrate resolve --applied 20260701000000_baseline_schema` is permitted only as an explicitly approved operational exception for adoption of an already-existing legacy schema. It must be performed under the approved runbook after a verified backup and schema inspection. It records migration history only, and baseline SQL must **not** be physically run again.

The current production baseline history is already marked applied after controlled recovery. Do not roll back, remove, or otherwise alter it. This repository's preflight verifies only the exact approved post-adoption fingerprint above; it does not perform adoption or modify `_prisma_migrations`.

After preflight permits that fingerprint, Prisma applies the committed reconciliation migration. Its `IF NOT EXISTS` DDL creates the two missing baseline tables and indexes. Prisma then applies the later committed migrations. The post-deploy assertion must verify all nine successful migration records, no rolled-back or unfinished records, the two recovered tables, their expected indexes, and `GameAttempt` from later migrations.

## Isolated Recovery Laboratory

Run the schema-only, synthetic local proof:

```powershell
./scripts/run-migration-recovery-lab.ps1
```

The laboratory starts an ephemeral PostgreSQL container and, only there:

1. creates the sanitized physical legacy schema without the two target tables;
2. records the approved baseline and historic migration history via `prisma migrate resolve --applied`, without re-running baseline SQL;
3. verifies that preflight permits the exact fingerprint;
4. runs the full committed Prisma migration sequence and verifies post-deploy schema/history assertions;
5. verifies the separate fresh empty database path.

It reads no `.env`, contacts no server, and contains no application rows, user data, Brain ID, email, tokens, JWTs, or raw telemetry. Near-miss cases are covered by `src/tests/migration-baseline-state.test.ts` and remain fail-closed.

The production health check remains `https://kognitika.ru/api/health`.
