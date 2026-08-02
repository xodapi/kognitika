# Sanitized migration-recovery fixtures

These fixtures describe schema metadata only. They contain no rows from a database and must never contain Brain ID, email, tokens, JWTs, telemetry, or any other user data.

`legacy-recovery.sql` constructs only the physical legacy schema in an isolated PostgreSQL database: the ten core tables and all 24 `GameType` values are present, while the two baseline-gap tables are absent. The laboratory harness creates the exact observed Prisma migration metadata separately, using Prisma CLI operations in the disposable container:

1. three historic `GameType` migrations recorded as applied;
2. baseline SQL attempted once and failing because `GameType` already exists;
3. the failed baseline recorded as rolled back; and
4. the baseline recorded as applied without rerunning its SQL.

This separation ensures the fixture has no production rows and proves the migration metadata behavior with the installed Prisma CLI rather than manually inserting `_prisma_migrations` records.
