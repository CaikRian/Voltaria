import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Camada de leitura de pedidos — usada pelas páginas de retorno do checkout,
// pelo webhook da Mercado Pago e pela área do cliente (/conta/pedidos).

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
}

// Lista os pedidos do cliente logado, mais recentes primeiro. Sem busca/filtro de
// status — a área do cliente só mostra os próprios pedidos.
export async function getOrdersByUser(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// Busca UM pedido, mas só se pertencer ao userId — a checagem de dono é a própria
// query (where: {id, userId}), não um "if" depois do fetch. findFirst (não
// findUnique) porque id+userId não é chave única composta. Retorna null tanto pra
// "não existe" quanto "existe mas não é seu" — a página trata os dois como
// notFound(), sem vazar qual dos dois é.
export async function getOrderForUser(id: string, userId: string) {
  return prisma.order.findFirst({
    where: { id, userId },
    include: {
      items: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
}

export function getOrderTrackingHint(statusEvents: { note?: string | null }[] = []) {
  const note = [...statusEvents]
    .reverse()
    .find((event) =>
      !!event.note && /(rastreio|rastrei|tracking|correios|envio|codigo.*envio)/i.test(event.note)
    );

  return note?.note ?? null;
}

// Atualiza o status do pedido e grava o evento no histórico numa única transação.
// Só cria um novo OrderStatusEvent se o status realmente mudou — evita duplicar a
// linha do tempo quando a Mercado Pago reenvia a mesma notificação (comportamento
// normal dela) ou quando o staff resubmete o mesmo status.
export async function updateOrderStatus(
  orderId: string,
  currentStatus: string,
  newStatus: string,
  opts?: { note?: string; orderData?: Prisma.OrderUpdateInput }
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus, ...opts?.orderData },
    });
    if (newStatus !== currentStatus) {
      await tx.orderStatusEvent.create({
        data: { orderId, status: newStatus, note: opts?.note },
      });
    }
    return order;
  });
}
