# Sanitized migration-recovery fixtures

These fixtures describe schema metadata only. They contain no rows from a database and must never contain Brain ID, email, tokens, JWTs, telemetry, or any other user data.

`legacy-recovery.sql` constructs the exact historic schema fingerprint in an isolated PostgreSQL database. It intentionally includes the three successful historic migrations, a rolled-back baseline attempt, and a subsequent resolved/applied baseline record to demonstrate that this history is rejected fail-closed.
