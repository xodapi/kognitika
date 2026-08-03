-- Prisma is the sole production DDL authority. This table is written only by
-- the Node/Prisma game-save transaction; Rust shadow components do not receive
-- database credentials or write access.
CREATE TABLE "analytics_outbox" (
    "id" TEXT NOT NULL,
    "sourceSessionId" TEXT NOT NULL,
    "analyzerVersion" TEXT NOT NULL,
    "contractVersion" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "authority" TEXT NOT NULL DEFAULT 'typescript',
    "shadowCandidate" TEXT NOT NULL DEFAULT 'rust',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analytics_outbox_idempotencyKey_key" ON "analytics_outbox"("idempotencyKey");
CREATE INDEX "analytics_outbox_sourceSessionId_idx" ON "analytics_outbox"("sourceSessionId");
CREATE INDEX "analytics_outbox_state_leaseExpiresAt_occurredAt_idx" ON "analytics_outbox"("state", "leaseExpiresAt", "occurredAt");

ALTER TABLE "analytics_outbox"
ADD CONSTRAINT "analytics_outbox_sourceSessionId_fkey"
FOREIGN KEY ("sourceSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
