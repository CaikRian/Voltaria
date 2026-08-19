import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const envPath = process.argv[2];
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  const [, key, rawValue] = m;
  const value = rawValue.replace(/^"(.*)"$/, "$1");
  if (!process.env[key]) process.env[key] = value;
}

const prisma = new PrismaClient();

const statements = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cpf" TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_cpf_key" ON "User"("cpf")`,
  `CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash")`,
  `CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId")`,
  `CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt")`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey') THEN
      ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowEmailUpdates" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowWhatsappUpdates" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "communicationConsentAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralSource" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" TEXT`,
];

for (const [i, sql] of statements.entries()) {
  process.stdout.write(`[${i + 1}/${statements.length}] running...\n`);
  await prisma.$executeRawUnsafe(sql);
  process.stdout.write(`[${i + 1}/${statements.length}] ok\n`);
}

await prisma.$disconnect();
process.stdout.write("DONE\n");
