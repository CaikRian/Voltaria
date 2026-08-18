import { prisma } from "@/lib/prisma";

// Camada de leitura pública de dúvidas — usada na página de produto.

export async function getProductQuestions(productId: string) {
  return prisma.question.findMany({
    where: { productId, hidden: false },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}
