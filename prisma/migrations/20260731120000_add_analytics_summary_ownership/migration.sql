ALTER TABLE "session_analytics_summaries"
ADD COLUMN "userId" TEXT;

UPDATE "session_analytics_summaries" AS summary
SET "userId" = session."userId"
FROM "GameSession" AS session
WHERE summary."sourceSessionId" = session."id";

CREATE INDEX "session_analytics_summaries_userId_createdAt_idx"
ON "session_analytics_summaries"("userId", "createdAt");

CREATE INDEX "session_analytics_summaries_userId_moduleId_createdAt_idx"
ON "session_analytics_summaries"("userId", "moduleId", "createdAt");

ALTER TABLE "session_analytics_summaries"
ADD CONSTRAINT "session_analytics_summaries_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
