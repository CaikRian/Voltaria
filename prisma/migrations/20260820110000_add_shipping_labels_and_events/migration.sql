ALTER TABLE "Order" ADD COLUMN "shipPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "shipDocument" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingLabelStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingLabelUrl" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingLabelCostCents" INTEGER;
ALTER TABLE "Order" ADD COLUMN "shippingInvoiceKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingLabelError" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingLabelPurchasedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "shippingLabelGeneratedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "shippingLastSyncAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "shippingNeedsAttention" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ShippingEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'MELHOR_ENVIO',
  "providerEvent" TEXT NOT NULL,
  "providerStatus" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "trackingCode" TEXT,
  "trackingUrl" TEXT,
  "needsAttention" BOOLEAN NOT NULL DEFAULT false,
  "externalEventKey" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShippingEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShippingEvent_externalEventKey_key" ON "ShippingEvent"("externalEventKey");
CREATE INDEX "ShippingEvent_orderId_occurredAt_idx" ON "ShippingEvent"("orderId", "occurredAt");
CREATE INDEX "ShippingEvent_needsAttention_createdAt_idx" ON "ShippingEvent"("needsAttention", "createdAt");
ALTER TABLE "ShippingEvent" ADD CONSTRAINT "ShippingEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
