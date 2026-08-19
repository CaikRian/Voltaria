ALTER TABLE "Order" ADD COLUMN "stockReservationStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Order" ADD COLUMN "stockReservedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "stockReservationExpiresAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "stockReleasedAt" TIMESTAMP(3);
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;

CREATE INDEX "Order_stockReservationStatus_stockReservationExpiresAt_idx"
ON "Order"("stockReservationStatus", "stockReservationExpiresAt");
