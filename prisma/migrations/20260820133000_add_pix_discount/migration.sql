ALTER TABLE "Order" ADD COLUMN "paymentChoice" TEXT;
ALTER TABLE "Order" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD COLUMN "originalUnitCents" INTEGER;

-- Pedidos anteriores não tiveram desconto específico por forma de pagamento.
UPDATE "OrderItem" SET "originalUnitCents" = "unitCents" WHERE "originalUnitCents" IS NULL;

ALTER TABLE "Order" ADD CONSTRAINT "Order_discountCents_check" CHECK ("discountCents" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentChoice_check" CHECK ("paymentChoice" IS NULL OR "paymentChoice" IN ('PIX', 'CARD_BOLETO'));
