CREATE TABLE IF NOT EXISTS "WebsiteVisit" (
  "id" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "productId" TEXT,
  "productName" TEXT,
  "referrerHost" TEXT,
  "utmSource" TEXT,
  "device" TEXT NOT NULL,
  "browser" TEXT NOT NULL,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "WebsiteVisit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WebsiteVisit_startedAt_idx" ON "WebsiteVisit"("startedAt");
CREATE INDEX IF NOT EXISTS "WebsiteVisit_path_startedAt_idx" ON "WebsiteVisit"("path", "startedAt");
CREATE INDEX IF NOT EXISTS "WebsiteVisit_productId_startedAt_idx" ON "WebsiteVisit"("productId", "startedAt");
CREATE INDEX IF NOT EXISTS "WebsiteVisit_visitorId_startedAt_idx" ON "WebsiteVisit"("visitorId", "startedAt");
CREATE INDEX IF NOT EXISTS "WebsiteVisit_sessionId_startedAt_idx" ON "WebsiteVisit"("sessionId", "startedAt");
