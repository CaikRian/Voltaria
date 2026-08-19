/**
 * Cleanup de pedidos abandonados (AGUARDANDO_PAGAMENTO > 30 minutos)
 * Pode ser executado via cron job, webhook de terceiro ou manualmente
 */

import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/orders";

const ABANDONMENT_TIMEOUT_MINUTES = 30;

export async function cleanupAbandonedOrders() {
  console.log(`[Order Cleanup] Procurando reservas expiradas há ${ABANDONMENT_TIMEOUT_MINUTES} minutos`);

  // Inclui pagamentos recusados porque o cliente pode tentar novamente enquanto
  // a janela estiver aberta; depois dela, o estoque precisa voltar ao catálogo.
  const abandonedOrders = await prisma.order.findMany({
    where: {
      status: { in: ["AGUARDANDO_PAGAMENTO", "PAGAMENTO_RECUSADO"] },
      stockReservationStatus: "RESERVED",
      stockReservationExpiresAt: { lt: new Date() },
      abandonedAt: null,
    },
  });

  console.log(`[Order Cleanup] Encontrados ${abandonedOrders.length} pedidos abandonados`);

  for (const order of abandonedOrders) {
    try {
      await updateOrderStatus(order.id, order.status, "CANCELADO", {
        note: "Reserva de estoque expirada após 30 minutos",
        orderData: {
          abandonedAt: new Date(),
          reasonCancelled: "Tempo para pagamento expirado",
        },
      });

      console.log(`[Order Cleanup] Pedido ${order.id} marcado como abandonado`);

    } catch (e) {
      console.error(`[Order Cleanup] Erro ao processar pedido ${order.id}:`, e);
    }
  }

  return abandonedOrders.length;
}

/**
 * Função auxiliar: Recupara pedidos abandonados (em caso de revisão manual)
 */
export async function getAbandonedOrders(limit = 100) {
  return prisma.order.findMany({
    where: {
      status: "AGUARDANDO_PAGAMENTO",
      abandonedAt: { not: null },
    },
    include: { items: true },
    orderBy: { abandonedAt: "desc" },
    take: limit,
  });
}

/**
 * Função auxiliar: Restaurar um pedido abandonado
 * (caso o cliente queira tentar pagar novamente)
 */
export async function restoreAbandonedOrder(orderId: string) {
  return prisma.order.update({
    where: { id: orderId },
    data: { abandonedAt: null },
  });
}

/**
 * Fecha automaticamente chats de pedido em que a equipe já respondeu e o
 * cliente ficou mais de 3 dias em silêncio. O prazo NUNCA conta enquanto quem
 * deve responder é a equipe (awaitingReplyFrom === "STAFF") — só existe pressão
 * de tempo do lado do cliente, que pode simplesmente sumir da conversa.
 */
const CHAT_INACTIVITY_TIMEOUT_DAYS = 3;

export async function closeStaleChats() {
  const cutoffTime = new Date(Date.now() - CHAT_INACTIVITY_TIMEOUT_DAYS * 24 * 60 * 60 * 1000);

  console.log(`[Chat Cleanup] Procurando chats aguardando cliente desde antes de ${cutoffTime.toISOString()}`);

  const staleChats = await prisma.order.findMany({
    where: {
      awaitingReplyFrom: "CLIENTE",
      chatWaitingSince: { lt: cutoffTime },
      chatClosedAt: null,
    },
    select: { id: true },
  });

  console.log(`[Chat Cleanup] Encontrados ${staleChats.length} chats inativos para fechar`);

  for (const order of staleChats) {
    try {
      await prisma.order.update({
        where: { id: order.id },
        data: { chatClosedAt: new Date() },
      });
    } catch (e) {
      console.error(`[Chat Cleanup] Erro ao fechar chat do pedido ${order.id}:`, e);
    }
  }

  return staleChats.length;
}
