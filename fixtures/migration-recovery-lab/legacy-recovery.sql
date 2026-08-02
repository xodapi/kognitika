-- Schema-only, synthetic laboratory fixture. No application or user rows are inserted.
-- It reproduces the legacy core tables and all 24 GameType values, while the two
-- baseline-gap tables remain absent. Migration history is created separately
-- by the laboratory's isolated `prisma migrate resolve --applied` adoption step.
\i /workspace/prisma/migrations/20260701000000_baseline_schema/migration.sql
DROP TABLE "session_analytics_summaries";
DROP TABLE "daily_practice_plans";
ALTER TYPE "GameType" ADD VALUE 'ALPHABET_TABLE';
ALTER TYPE "GameType" ADD VALUE 'STROOP_ALPHABET';
