-- Canonical completed-session jobs are validated by Node before persistence and
-- bound to the authoritative GameSession. They are intentionally separate from
-- GameSession.metadata and the analytics outbox contains no raw event payload.
CREATE TABLE "completed_session_analytics_jobs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "moduleVersion" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "analyzerVersion" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "completed_session_analytics_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "completed_session_analytics_jobs_jobId_key" ON "completed_session_analytics_jobs"("jobId");
CREATE UNIQUE INDEX "completed_session_analytics_jobs_gameSessionId_key" ON "completed_session_analytics_jobs"("gameSessionId");
CREATE INDEX "completed_session_analytics_jobs_moduleId_completedAt_idx" ON "completed_session_analytics_jobs"("moduleId", "completedAt");

ALTER TABLE "completed_session_analytics_jobs"
ADD CONSTRAINT "completed_session_analytics_jobs_gameSessionId_fkey"
FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
