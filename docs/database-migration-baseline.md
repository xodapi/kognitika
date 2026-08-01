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
- Missing migration history, missing baseline history, incomplete schema, rolled-back migration, unfinished migration, or a gap in history: deployment stops before DDL, build, or restart.

### Adoption Runbook

Manual adoption is permitted only after all of these prerequisites are met:

1. Obtain explicit production-change approval and schedule a maintenance window.
2. Take and verify a database backup. Record the backup location and restore owner.
3. Inspect `_prisma_migrations`, the `GameType` enum, and the expected baseline tables. Confirm the database contains the schema represented by the historical baseline, without partial or failed migrations.
4. Run the preflight script with the production `DATABASE_URL`; it must fail only because baseline history is missing.
5. Record the approval, schema evidence, and rollback plan in the deployment record.

Then record the baseline without executing its SQL:

```bash
pnpm exec prisma migrate resolve --applied 20260701000000_baseline_schema
pnpm exec prisma migrate deploy
```

`migrate resolve` does not replace a schema review. It is not permitted for incomplete schemas, missing tables, failed migrations, or unknown migration history. Do not use `prisma db push`, `migrate reset`, or manual edits to `_prisma_migrations` in production. If the schema differs from the expected pre-baseline state, stop and create a reviewed reconciliation migration first.

The production health check remains `https://kognitika.ru/api/health`.
