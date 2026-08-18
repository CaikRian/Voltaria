import type { Prisma } from "@prisma/client";
import { Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { mpClient } from "@/lib/mercadopago";
import { mapMercadoPagoStatusToOrderStatus } from "@/lib/order-status";

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
    include: {
      items: {
        select: { id: true, productName: true, variantName: true, qty: true },
        orderBy: { id: "asc" },
      },
      _count: { select: { items: true } },
    },
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

// Sem integração com transportadora — só monta o link público dos Correios quando
// o vendedor colou só o código (sem link próprio) e ele bate com o padrão deles
// (2 letras + 9 dígitos + 2 letras, ex. AA123456789BR). Qualquer link colado
// manualmente tem prioridade — cobre outras transportadoras.
const CORREIOS_CODE_RE = /^[A-Z]{2}\d{9}[A-Z]{2}$/;

export function resolveTrackingUrl(code?: string | null, url?: string | null) {
  if (url) return url;
  if (code && CORREIOS_CODE_RE.test(code.toUpperCase())) {
    return `https://rastreamento.correios.com.br/app/index.php?objetos=${code}`;
  }
  return null;
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
  _currentStatus: string,
  newStatus: string,
  opts?: { note?: string; orderData?: Prisma.OrderUpdateManyMutationInput }
) {
  return prisma.$transaction(async (tx) => {
    // O update condicional é atômico: se webhook e página de retorno tentarem
    // aplicar o mesmo status juntos, apenas uma chamada altera a linha e cria
    // o evento. A outra só atualiza os metadados idempotentes do pagamento.
    const statusChange = await tx.order.updateMany({
      where: { id: orderId, status: { not: newStatus } },
      data: { status: newStatus, ...opts?.orderData },
    });

    if (statusChange.count === 0 && opts?.orderData) {
      await tx.order.update({ where: { id: orderId }, data: opts.orderData });
    }

    if (statusChange.count === 1) {
      await tx.orderStatusEvent.create({
        data: { orderId, status: newStatus, note: opts?.note },
      });
    }

    return tx.order.findUniqueOrThrow({ where: { id: orderId } });
  });
}

// Busca o pagamento de verdade na Mercado Pago e atualiza o pedido correspondente.
// Nunca confia em status vindo de query string/corpo — o `paymentId` é só uma
// chave de busca, o dado usado pra decidir o status é sempre o que a API da MP
// devolve. Usada pelo webhook (fonte primária) E pela página de retorno do
// checkout (rede de segurança: garante que o pedido atualiza mesmo se o
// webhook não chegar, sem esperar o cliente ficar sabendo por outro canal).
export async function reconcilePaymentStatus(paymentId: string) {
  const payment = await new Payment(mpClient).get({ id: paymentId });

  const orderId = payment.external_reference;
  if (!orderId) return null;

  const order = await getOrderById(orderId);
  if (!order) return null;

  const newStatus = mapMercadoPagoStatusToOrderStatus(payment.status ?? "");

  await updateOrderStatus(order.id, order.status, newStatus, {
    note: payment.status_detail ?? undefined,
    orderData: {
      mpPaymentId: String(payment.id),
      mpPaymentMethod: payment.payment_type_id ?? null,
      mpStatusDetail: payment.status_detail ?? null,
    },
  });

  return { orderId, status: newStatus };
}
