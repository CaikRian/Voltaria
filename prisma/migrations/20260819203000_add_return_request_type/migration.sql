-- Distingue cancelamento antes do envio de devolução com logística reversa.
ALTER TABLE "ReturnRequest" ADD COLUMN "requestType" TEXT NOT NULL DEFAULT 'RETURN';
