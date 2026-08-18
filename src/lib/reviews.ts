import { prisma } from "@/lib/prisma";

// Camada de leitura pública de avaliações — usada na página de produto.

export async function getProductReviews(productId: string) {
  return prisma.review.findMany({
    where: { productId, hidden: false },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductRatingSummary(productId: string) {
  const agg = await prisma.review.aggregate({
    where: { productId, hidden: false },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { average: agg._avg.rating ?? 0, count: agg._count.rating };
}

// Inclui avaliações ocultas pela moderação: mesmo que uma avaliação deixe de
// aparecer publicamente, ela continua contando como a avaliação única daquele
// cliente para o produto.
export async function getUserProductReview(userId: string, productId: string) {
  return prisma.review.findUnique({
    where: { productId_userId: { productId, userId } },
    select: { id: true, hidden: true },
  });
}

// Confere compra verificada (existe um OrderItem desse produto numa Order do
// próprio usuário com pagamento confirmado). Vive aqui, não em lib/orders.ts,
// porque só serve o gate de review:write — apesar de ser tecnicamente uma
// consulta de OrderItem/Order, não tem outro consumidor além deste.
export async function hasVerifiedPurchase(userId: string, productId: string): Promise<boolean> {
  const item = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId,
        status: { in: ["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO", "ENVIADO", "ENTREGUE"] },
      },
    },
    select: { id: true },
  });
  return !!item;
}
