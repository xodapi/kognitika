ALTER TABLE "GameSession"
ADD COLUMN "clientRunId" TEXT;

ALTER TABLE "XpEvent"
ADD COLUMN "gameSessionId" TEXT;

CREATE UNIQUE INDEX "GameSession_userId_clientRunId_key"
ON "GameSession"("userId", "clientRunId");

CREATE UNIQUE INDEX "XpEvent_gameSessionId_key"
ON "XpEvent"("gameSessionId");

ALTER TABLE "XpEvent"
ADD CONSTRAINT "XpEvent_gameSessionId_fkey"
FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
