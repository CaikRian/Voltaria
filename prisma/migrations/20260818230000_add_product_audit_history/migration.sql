-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductAuditEvent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductAuditEvent_productId_createdAt_idx" ON "ProductAuditEvent"("productId", "createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductAuditEvent_productId_fkey') THEN
    ALTER TABLE "ProductAuditEvent" ADD CONSTRAINT "ProductAuditEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
