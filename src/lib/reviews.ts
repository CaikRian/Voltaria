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
