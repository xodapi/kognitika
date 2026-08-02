# Database Migration Baseline

`20260701000000_baseline_schema` is the initial Prisma migration for fresh PostgreSQL databases. It creates the schema that existed before the incremental migrations committed on 2026-07-24 and later.

## Fresh Databases

Run the normal command:

```bash
pnpm exec prisma migrate deploy
```

The baseline and all incremental migrations apply in chronological order.

## Existing Databases

Do not run the baseline SQL against an existing Kognitika database. Before `prisma migrate deploy`, the deployment workflow runs `scripts/check-migration-baseline.mjs` and classifies the database as follows:

- Empty database: no public tables, no `GameType` enum, and no `_prisma_migrations` table. The baseline applies normally.
- Compatible existing database: all baseline tables and `GameType` exist, the baseline is recorded as applied, and migration history is a continuous successful prefix. Pending later migrations may then apply normally.
- Legacy recovery laboratory state: the historic schema fingerprint (three `GameType` migrations, all core tables, all 24 `GameType` values in order, and both `session_analytics_summaries` and `daily_practice_plans` absent) is **blocked**. Its Prisma history cannot be reconciled deterministically as a continuous prefix.
- Missing migration history, a legacy fingerprint, an incomplete legacy fingerprint, missing baseline history, incomplete schema, rolled-back migration, unfinished migration, or a gap in history: deployment stops before DDL, build, or restart.

### Legacy Recovery Laboratory Result

The isolated PostgreSQL laboratory reproduces the historic schema fingerprint using schema metadata only. It proves that the two missing tables and their indexes can be created by the committed reconciliation migration, and that the later committed migrations can alter that isolated schema. It also proves this is **not** a safe Prisma recovery path: Prisma's migration history cannot be made a deterministic continuous prefix without recording a migration whose SQL has not run, or manually changing `_prisma_migrations`.

Therefore the preflight blocks the fingerprint. Do **not** mark `20260701000000_baseline_schema` as applied, use `prisma db push`, `migrate reset`, `migrate resolve`, or manually edit `_prisma_migrations` in production. Any production recovery requires a separately reviewed deterministic plan and remains outside this repository change.

#### Run the isolated laboratory

This command starts an ephemeral local PostgreSQL container, loads only synthetic schema metadata, verifies the expected blocked classification, applies only committed migration SQL to the isolated database, and verifies the expected tables and indexes:

```powershell
./scripts/run-migration-recovery-lab.ps1
```

It does not read `.env`, contact a server, or use a production connection string. The fixture contains no application rows or sensitive data.

The production health check remains `https://kognitika.ru/api/health`.
