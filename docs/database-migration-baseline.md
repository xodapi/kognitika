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
- Confirmed legacy reconciliation state: exactly the three historic `GameType` migrations are successfully applied, all core baseline tables and all current `GameType` labels exist, and both `session_analytics_summaries` and `daily_practice_plans` are absent. The committed reconciliation migration may create only those two missing tables before later migrations run.
- Missing migration history, an incomplete legacy fingerprint, missing baseline history, incomplete schema, rolled-back migration, unfinished migration, or a gap in history: deployment stops before DDL, build, or restart.

### Legacy Reconciliation Runbook

The legacy reconciliation is permitted only after all prerequisites are met:

1. Obtain explicit production-change approval and schedule a maintenance window.
2. Take and verify a database backup. Record the backup location and restore owner.
3. Inspect `_prisma_migrations`, the `GameType` enum, core tables, and both missing target tables. Confirm the exact reviewed legacy fingerprint.
4. Run the preflight script with the production `DATABASE_URL`; it must report `Confirmed legacy schema fingerprint`.
5. Record approval, schema evidence, backup location, and rollback owner in the deployment record.
6. Run the normal reviewed deployment. It applies `20260725140000_reconcile_legacy_baseline_gap`, then the later committed migrations.

Do **not** mark `20260701000000_baseline_schema` as applied for this state. Its SQL creates the two missing tables, so recording it would create false migration history. Do not use `prisma db push`, `migrate reset`, `migrate resolve`, or manual edits to `_prisma_migrations` in production. Any state other than the exact fingerprint must remain blocked and receive a separate reviewed reconciliation plan.

The production health check remains `https://kognitika.ru/api/health`.
