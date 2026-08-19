ALTER TABLE "WebsiteVisit" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

UPDATE "WebsiteVisit"
SET "lastSeenAt" = COALESCE("endedAt", "startedAt")
WHERE "lastSeenAt" IS NULL;

ALTER TABLE "WebsiteVisit"
  ALTER COLUMN "lastSeenAt" SET NOT NULL,
  ALTER COLUMN "lastSeenAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "WebsiteVisit_lastSeenAt_idx" ON "WebsiteVisit"("lastSeenAt");
