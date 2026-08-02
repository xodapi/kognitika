-- This migration is intentionally idempotent for fresh databases, where the
-- baseline already created these tables. The deployment preflight permits it on
-- an existing database only for the exact reviewed legacy fingerprint.
CREATE TABLE IF NOT EXISTS "session_analytics_summaries" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "sourceSessionId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventCount" INTEGER NOT NULL,
    "clickCount" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "p50ReactionMs" INTEGER NOT NULL,
    "p95ReactionMs" INTEGER NOT NULL,
    "speedSlope" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "fatigueIndex" DOUBLE PRECISION NOT NULL,
    "engagementIndex" DOUBLE PRECISION NOT NULL,
    "suspiciousPatternScore" DOUBLE PRECISION NOT NULL,
    "recommendationSignals" JSONB NOT NULL,

    CONSTRAINT "session_analytics_summaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "daily_practice_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_practice_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "session_analytics_summaries_jobId_key"
ON "session_analytics_summaries"("jobId");

CREATE INDEX IF NOT EXISTS "session_analytics_summaries_moduleId_idx"
ON "session_analytics_summaries"("moduleId");

CREATE INDEX IF NOT EXISTS "session_analytics_summaries_category_idx"
ON "session_analytics_summaries"("category");

CREATE INDEX IF NOT EXISTS "session_analytics_summaries_createdAt_idx"
ON "session_analytics_summaries"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "daily_practice_plans_userId_date_key"
ON "daily_practice_plans"("userId", "date");
