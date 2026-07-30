-- CreateTable
CREATE TABLE "GameAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL,
    "clientRunId" TEXT NOT NULL,
    "challengeDigest" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notBefore" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "gameSessionId" TEXT,

    CONSTRAINT "GameAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameAttempt_gameSessionId_key" ON "GameAttempt"("gameSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "GameAttempt_userId_clientRunId_key" ON "GameAttempt"("userId", "clientRunId");

-- CreateIndex
CREATE INDEX "GameAttempt_userId_expiresAt_idx" ON "GameAttempt"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "GameAttempt_consumedAt_idx" ON "GameAttempt"("consumedAt");

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
