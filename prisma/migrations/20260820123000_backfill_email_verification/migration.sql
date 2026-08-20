-- Contas por senha criadas antes do fluxo de confirmação são consideradas
-- verificadas para que clientes existentes não percam o acesso no deploy.
UPDATE "User"
SET "emailVerified" = COALESCE("emailVerified", "createdAt")
WHERE "passwordHash" IS NOT NULL
  AND "emailVerified" IS NULL;
