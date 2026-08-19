ALTER TABLE "Product" ADD COLUMN "weightGrams" INTEGER NOT NULL DEFAULT 300;
ALTER TABLE "Product" ADD COLUMN "widthCm" INTEGER NOT NULL DEFAULT 11;
ALTER TABLE "Product" ADD COLUMN "heightCm" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Product" ADD COLUMN "lengthCm" INTEGER NOT NULL DEFAULT 16;

ALTER TABLE "Order" ADD COLUMN "shippingProvider" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingServiceId" TEXT;
ALTER TABLE "Order" ADD COLUMN "melhorEnvioOrderId" TEXT;
CREATE UNIQUE INDEX "Order_melhorEnvioOrderId_key" ON "Order"("melhorEnvioOrderId");

CREATE TABLE "IntegrationCredential" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "encryptedAccessToken" TEXT NOT NULL,
  "encryptedRefreshToken" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IntegrationCredential_provider_key" ON "IntegrationCredential"("provider");
