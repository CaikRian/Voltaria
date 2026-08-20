CREATE TABLE "OrderFeedback" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deliveryRating" INTEGER NOT NULL,
  "serviceRating" INTEGER NOT NULL,
  "sellerRating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderFeedback_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrderFeedback_orderId_key" ON "OrderFeedback"("orderId");
CREATE INDEX "OrderFeedback_userId_createdAt_idx" ON "OrderFeedback"("userId", "createdAt");
CREATE INDEX "OrderFeedback_createdAt_idx" ON "OrderFeedback"("createdAt");
ALTER TABLE "OrderFeedback" ADD CONSTRAINT "OrderFeedback_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderFeedback" ADD CONSTRAINT "OrderFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderFeedback" ADD CONSTRAINT "OrderFeedback_deliveryRating_check" CHECK ("deliveryRating" BETWEEN 1 AND 5);
ALTER TABLE "OrderFeedback" ADD CONSTRAINT "OrderFeedback_serviceRating_check" CHECK ("serviceRating" BETWEEN 1 AND 5);
ALTER TABLE "OrderFeedback" ADD CONSTRAINT "OrderFeedback_sellerRating_check" CHECK ("sellerRating" BETWEEN 1 AND 5);
