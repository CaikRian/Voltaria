/**
 * Cleanup de pedidos abandonados (AGUARDANDO_PAGAMENTO > 30 minutos)
 * Pode ser executado via cron job, webhook de terceiro ou manualmente
 */

import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/orders";

const ABANDONMENT_TIMEOUT_MINUTES = 30;

export async function cleanupAbandonedOrders() {
  const cutoffTime = new Date(Date.now() - ABANDONMENT_TIMEOUT_MINUTES * 60 * 1000);

  console.log(`[Order Cleanup] Procurando por pedidos não pagos desde ${cutoffTime.toISOString()}`);

  // Busca todos os pedidos que:
  // 1. Estão em AGUARDANDO_PAGAMENTO
  // 2. Foram criados há mais de 30 minutos
  // 3. Ainda não foram marcados como abandonados
  const abandonedOrders = await prisma.order.findMany({
    where: {
      status: "AGUARDANDO_PAGAMENTO",
      createdAt: { lt: cutoffTime },
      abandonedAt: null,
    },
  });

  console.log(`[Order Cleanup] Encontrados ${abandonedOrders.length} pedidos abandonados`);

  for (const order of abandonedOrders) {
    try {
      // Marca como abandonado
      await prisma.order.update({
        where: { id: order.id },
        data: { abandonedAt: new Date() },
      });

      console.log(`[Order Cleanup] Pedido ${order.id} marcado como abandonado`);

      // Nota: NÃO cancela automaticamente! Apenas marca para você rever depois.
      // Se quiser cancelar automaticamente, descomente a linha abaixo:
      // await updateOrderStatus(order.id, "AGUARDANDO_PAGAMENTO", "CANCELADO", {
      //   note: "Cancelado automaticamente - sem tentativa de pagamento",
      // });
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
