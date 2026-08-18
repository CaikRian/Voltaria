import { prisma } from "@/lib/prisma";

// Camada de leitura de endereços salvos — usada em /conta/dados e no checkout.

export async function getAddressesByUser(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

// findFirst (não findUnique) por {id,userId} — mesmo padrão de getOrderForUser:
// retorna null tanto pra "não existe" quanto "existe mas não é seu".
export async function getAddressForUser(id: string, userId: string) {
  return prisma.address.findFirst({ where: { id, userId } });
}
