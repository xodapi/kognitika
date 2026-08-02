-- Schema-only, synthetic laboratory fixture. No application or user rows are inserted.
-- It reproduces the legacy core tables and all 24 GameType values, while the two
-- baseline-gap tables remain absent.
\i /workspace/prisma/migrations/20260701000000_baseline_schema/migration.sql
DROP TABLE "session_analytics_summaries";
DROP TABLE "daily_practice_plans";
ALTER TYPE "GameType" ADD VALUE 'ALPHABET_TABLE';
ALTER TYPE "GameType" ADD VALUE 'STROOP_ALPHABET';

CREATE TABLE "_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count") VALUES
  ('00000000-0000-0000-0000-000000000001', 'synthetic-fixture', '2026-07-24T18:00:00Z', '20260724180000_add_express_knowledge_game_types', 1),
  ('00000000-0000-0000-0000-000000000002', 'synthetic-fixture', '2026-07-25T12:00:00Z', '20260725120000_add_alphabet_table_game_type', 1),
  ('00000000-0000-0000-0000-000000000003', 'synthetic-fixture', '2026-07-25T13:00:00Z', '20260725130000_add_stroop_alphabet_game_type', 1),
  ('00000000-0000-0000-0000-000000000004', 'synthetic-fixture', NULL, '20260701000000_baseline_schema', 0),
  ('00000000-0000-0000-0000-000000000005', 'synthetic-fixture', '2026-07-25T14:00:00Z', '20260701000000_baseline_schema', 0);
UPDATE "_prisma_migrations"
SET "rolled_back_at" = '2026-07-25T14:01:00Z'
WHERE "id" = '00000000-0000-0000-0000-000000000004';
