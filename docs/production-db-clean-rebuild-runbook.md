# Production Database Clean Rebuild Runbook

**Status:** prepared, not executable until every precondition is recorded in the linked review.

This runbook applies only to an explicitly approved clean rebuild. It deletes the complete production PostgreSQL `public` schema and all application data, then recreates the schema from committed Prisma migrations.

## Approved operation boundary

- Required workflow: **Production Database Migration**.
- Required `operation`: `clean_rebuild`.
- Required acknowledgement: `DELETE_PRODUCTION_DATA`.
- Required environment: `production-db-changes`, with the production `DATABASE_URL` scoped only to that protected environment.
- Required external reviewer: the configured GitHub Environment reviewer.
- Required database authority: Prisma migrations only. Rust receives no database credential, DDL authority, or write authority.
- Normal deployment remains read-only at the database boundary.

## Preconditions

All items must be attached to the GitHub review before dispatch:

1. **Maintenance window.** Announce the expected short outage and stop new writes through the normal maintenance procedure.
2. **Durable backup.** Create a timestamped logical PostgreSQL backup on the production host or approved durable storage, outside GitHub Actions. Do not store database dumps as Actions artifacts.
3. **Verified restore.** Restore that exact archive into an isolated disposable PostgreSQL database. Record the archive path, SHA-256 checksum, restore command exit status, and isolated database identifier in the review. Do not put connection strings, rows, Brain IDs, email, JWTs, tokens, or telemetry in the review.
4. **Target review.** Record the exact immutable `target_sha`, this runbook ID, and a review URL. The target must be a green `main` commit.
5. **Workflow environment.** Confirm `production-db-changes` has required reviewers, protected-branch policy, and only its scoped `DATABASE_URL` secret.
6. **Rollback owner.** Name the operator who can restore the durable archive if the fresh migration or smoke checks fail.

## Dispatch inputs

Use the protected manual workflow with:

- `base_sha`: the currently deployed commit SHA;
- `target_sha`: reviewed green `main` commit SHA;
- `db_change_runbook_id`: a unique `PDD-DB-YYYY-MM-DD-...` identifier;
- `review_url`: the GitHub issue or PR containing the evidence above;
- `operation`: `clean_rebuild`;
- `destructive_confirmation`: exactly `DELETE_PRODUCTION_DATA`;
- `verified_backup_reference`: the durable archive identifier already restore-tested outside Actions.

The workflow validates the reviewed diff and identifier, validates that the destructive acknowledgement and backup reference are present, drops and recreates only the `public` schema, then runs `pnpm exec prisma migrate deploy` and `pnpm exec prisma migrate status`.

## Postconditions

Before reopening the service, verify:

1. Prisma reports the migration history is up to date.
2. `/api/health` returns successfully after the ordinary application deploy/restart path.
3. A fresh registration/login flow works with a new test account.
4. A completed game save works for that new account.
5. No production database URL, credentials, backup contents, Brain IDs, email, JWTs, or raw telemetry are present in logs, issues, or PRs.

## Failure and rollback

Do not attempt `prisma migrate resolve`, `prisma db push`, manual `_prisma_migrations` edits, or ad hoc SQL repair. If any migration, health, login, or game-save check fails, keep the service in maintenance and restore the verified durable backup using the recorded restore procedure. Verify the restore in isolation before reopening production.
