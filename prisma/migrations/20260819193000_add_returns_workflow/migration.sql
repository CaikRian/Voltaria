-- Fluxo auditável de devoluções e reembolsos parciais.
ALTER TABLE "Order" ADD COLUMN "refundedCents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ReturnRequest" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "reasonCategory" TEXT NOT NULL,
  "reasonDetails" TEXT NOT NULL,
  "evidenceUrls" TEXT,
  "customerNote" TEXT,
  "staffNote" TEXT,
  "rejectionReason" TEXT,
  "reverseInstructions" TEXT,
  "reverseTrackingCode" TEXT,
  "reverseTrackingUrl" TEXT,
  "reverseLabelUrl" TEXT,
  "requestedCents" INTEGER NOT NULL,
  "approvedCents" INTEGER,
  "includeShipping" BOOLEAN NOT NULL DEFAULT false,
  "mpRefundId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "refundError" TEXT,
  "reviewedById" TEXT,
  "reviewedByName" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "shippedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "inspectedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReturnItem" (
  "id" TEXT NOT NULL,
  "returnRequestId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "unitCents" INTEGER NOT NULL,
  "condition" TEXT,
  "restockDecision" TEXT NOT NULL DEFAULT 'PENDING',
  "restockedAt" TIMESTAMP(3),
  CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReturnEvent" (
  "id" TEXT NOT NULL,
  "returnRequestId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "note" TEXT,
  "actorId" TEXT,
  "actorName" TEXT,
  "actorRole" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReturnEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReturnRequest_mpRefundId_key" ON "ReturnRequest"("mpRefundId");
CREATE UNIQUE INDEX "ReturnRequest_idempotencyKey_key" ON "ReturnRequest"("idempotencyKey");
CREATE INDEX "ReturnRequest_orderId_createdAt_idx" ON "ReturnRequest"("orderId", "createdAt");
CREATE INDEX "ReturnRequest_userId_createdAt_idx" ON "ReturnRequest"("userId", "createdAt");
CREATE INDEX "ReturnRequest_status_createdAt_idx" ON "ReturnRequest"("status", "createdAt");
CREATE UNIQUE INDEX "ReturnItem_returnRequestId_orderItemId_key" ON "ReturnItem"("returnRequestId", "orderItemId");
CREATE INDEX "ReturnItem_orderItemId_idx" ON "ReturnItem"("orderItemId");
CREATE INDEX "ReturnEvent_returnRequestId_createdAt_idx" ON "ReturnEvent"("returnRequestId", "createdAt");
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnEvent" ADD CONSTRAINT "ReturnEvent_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
