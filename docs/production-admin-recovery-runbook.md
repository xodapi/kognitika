# Production ADMIN Recovery Runbook

**Status:** prepared. The workflow is intentionally dry-run by default and does not authorize itself to change production.

Use this runbook only to recover administrative access to the **Kognitika** deployment. The local `C:\project\03_04\.env` database was identified as an unrelated application schema and is explicitly out of scope.

## Safety boundary

- Required workflow: **Recover Kognitika ADMIN Access**.
- Required Environment: `production-db-changes`, including its configured external reviewer.
- Required review: [issue #220](https://github.com/xodapi/kognitika/issues/220), or a linked reviewed PR/issue that records the operational evidence.
- Required credential source: `/opt/kognitika/.env` on the protected Kognitika host only.
- Prohibited sources: workflow inputs, repository files, issue/PR text, Actions logs, chat, screenshots, artifacts, and local `.env` files from other applications.
- The workflow verifies the Kognitika `User` schema before it can generate a recovery credential or open a write transaction.

## Preconditions

1. Confirm the target is the Kognitika host and the ordinary repository-first deploy contract is intact.
2. Record a review URL and a unique `PDD-ADMIN-YYYY-MM-DD-<ID>` recovery identifier in the review. Do not include a raw Brain ID, JWT, password, database URL, user row, IP address, or telemetry.
3. Confirm `production-db-changes` requires the intended reviewer and has only scoped deployment secrets.
4. Run `dry_run` first. It must report `Kognitika schema guard passed` and `No user or credential was created`.
   - A failed dry run emits only one fixed diagnostic: `database-client-unavailable`, `database-connection-failed`, `schema-function-query-failed`, `information-schema-query-failed`, `kognitika-schema-query-failed`, or `kognitika-schema-mismatch`. It must not expose the DB URL, host, database name, credentials, row contents, or identity material.
   - Treat `database-client-unavailable` or `database-connection-failed` as protected-host operations blockers. Treat `schema-function-query-failed`, `information-schema-query-failed`, or `kognitika-schema-query-failed` as read-only schema compatibility blockers. Do not retry a write operation until the corresponding repository-reviewed infrastructure issue is resolved.
5. Decide whether an existing, securely selected profile should be elevated instead. This workflow deliberately does **not** accept a Brain ID as an Actions input. That operation needs a separate reviewed path with an out-of-band selection mechanism.

## Create one recovery administrator

Dispatch the manual workflow with:

- `recovery_runbook_id`: the reviewed `PDD-ADMIN-...` identifier;
- `review_url`: the linked Kognitika issue/PR;
- `operation`: `create_recovery_admin`;
- `recovery_confirmation`: exactly `CREATE_ONE_RECOVERY_ADMIN`.

After Environment approval, the workflow:

1. loads the production database connection only from `/opt/kognitika/.env`;
2. checks that `User`, `brainId`, `pseudonym`, and `role` match Kognitika's schema;
3. creates exactly one new `ADMIN` record inside a transaction;
4. writes its one-time Brain ID to a mode-`0600` file on the protected host, outside the repository and Actions workspace;
5. prints only non-sensitive status messages.

The configured Environment reviewer receives the credential through an approved secure channel controlled outside Actions, then signs in at `/admin`. Do not paste it into GitHub, browser console output, chat, or tickets. Delete the recovery file after successful sign-in and after recording a redacted completion status in the review.

## Expected no-op and failure behavior

- `dry_run` makes no database write and creates no credential.
- Missing or mismatched Kognitika schema aborts before any credential generation or transaction. This protects against the previously discovered unrelated `stroy` schema.
- Reusing a recovery identifier aborts before a second recovery account can be created.
- Missing Environment approval, invalid review URL, invalid operation, or missing confirmation aborts.
- The workflow does not reset data, change existing roles, create passwords or JWTs, alter Prisma migration history, run DDL, restart the service, or deploy code.

## Verification and cleanup

1. Use the secure handoff credential to restore the newly created Brain profile through the normal application flow.
2. Open `/admin` and verify the admin UI loads.
3. Delete the protected-host recovery credential file using the approved operator channel.
4. Record only `recovery verified` or `recovery not verified` in the review. Never record the identifier itself if it would disclose access material.
5. If verification fails, disable or remove the recovery account through a separately approved, schema-guarded operation. Do not perform ad hoc SQL or client-side role changes.
