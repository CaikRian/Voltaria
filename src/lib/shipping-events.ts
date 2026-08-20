import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/orders";
import { melhorEnvioFetch } from "@/lib/melhor-envio";
import { sendOrderEmail } from "@/lib/transactional-email";

const META: Record<string, { title: string; description: string; labelStatus: string; attention?: boolean }> = {
  "order.created": { title: "Etiqueta adicionada ao carrinho", description: "O envio foi registrado no Melhor Envio.", labelStatus: "CART" },
  "order.pending": { title: "Etiqueta pendente", description: "A etiqueta voltou ao carrinho e precisa de ação da equipe.", labelStatus: "CART", attention: true },
  "order.released": { title: "Frete pago", description: "A etiqueta foi liberada após o pagamento.", labelStatus: "PURCHASED" },
  "order.generated": { title: "Etiqueta gerada", description: "A etiqueta está pronta para impressão e postagem.", labelStatus: "GENERATED" },
  "order.received": { title: "Recebido no ponto de distribuição", description: "O pacote foi recebido por um ponto parceiro da operação logística.", labelStatus: "POSTED" },
  "order.posted": { title: "Produto despachado", description: "O pacote foi aceito pela transportadora e iniciou o transporte.", labelStatus: "POSTED" },
  "order.delivered": { title: "Produto entregue", description: "A transportadora confirmou a entrega no endereço informado.", labelStatus: "DELIVERED" },
  "order.cancelled": { title: "Etiqueta cancelada", description: "O envio foi cancelado no Melhor Envio.", labelStatus: "CANCELLED", attention: true },
  "order.undelivered": { title: "Tentativa de entrega sem sucesso", description: "A transportadora não conseguiu concluir a entrega. A equipe deve acompanhar a ocorrência.", labelStatus: "ISSUE", attention: true },
  "order.paused": { title: "Entrega pausada", description: "A entrega foi interrompida e pode exigir uma ação do remetente ou destinatário.", labelStatus: "ISSUE", attention: true },
  "order.suspended": { title: "Envio suspenso", description: "A transportadora suspendeu temporariamente o envio. A equipe deve verificar o motivo.", labelStatus: "ISSUE", attention: true },
};

export function shippingEventMeta(event: string, status?: string | null) {
  return META[event] ?? { title: "Atualização da transportadora", description: status ? `Novo status informado: ${status}.` : "O envio recebeu uma nova atualização.", labelStatus: status?.toUpperCase() || "UPDATED" };
}

export async function recordShippingEvent(input: {
  orderId: string; labelId: string; event: string; status?: string | null; trackingCode?: string | null;
  trackingUrl?: string | null; occurredAt?: Date; description?: string | null;
}) {
  const meta = shippingEventMeta(input.event, input.status);
  const occurredAt = input.occurredAt ?? new Date();
  const externalEventKey = `${input.labelId}:${input.event}:${occurredAt.toISOString()}`;
  let eventCreated = false;
  try {
    await prisma.shippingEvent.create({ data: {
      orderId: input.orderId, providerEvent: input.event, providerStatus: input.status,
      title: meta.title, description: input.description || meta.description,
      trackingCode: input.trackingCode, trackingUrl: input.trackingUrl,
      needsAttention: !!meta.attention, externalEventKey, occurredAt,
    } });
    eventCreated = true;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }

  const order = await prisma.order.findUnique({ where: { id: input.orderId }, select: { status: true } });
  if (!order) return;
  const orderData = {
    shippingLabelStatus: meta.labelStatus,
    shippingNeedsAttention: !!meta.attention,
    shippingLastSyncAt: new Date(),
    ...(input.trackingCode ? { trackingCode: input.trackingCode } : {}),
    ...(input.trackingUrl ? { trackingUrl: input.trackingUrl } : {}),
  };
  if (["order.received", "order.posted"].includes(input.event) && ["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO"].includes(order.status)) {
    await updateOrderStatus(input.orderId, order.status, "ENVIADO", { note: meta.title, orderData });
  } else if (input.event === "order.delivered" && order.status === "ENVIADO") {
    await updateOrderStatus(input.orderId, order.status, "ENTREGUE", { note: meta.title, orderData });
  } else if (["order.released", "order.generated"].includes(input.event) && order.status === "PAGAMENTO_APROVADO") {
    await updateOrderStatus(input.orderId, order.status, "PREPARANDO_ENVIO", { note: meta.title, orderData });
  } else {
    await prisma.order.update({ where: { id: input.orderId }, data: orderData });
  }
  if (eventCreated && meta.attention) {
    await sendOrderEmail(input.orderId, "SHIPPING_ATTENTION", { note: input.description || meta.description, trackingCode: input.trackingCode, trackingUrl: input.trackingUrl });
  }
}

export async function syncActiveShipments(limit = 30) {
  const orders = await prisma.order.findMany({
    where: { melhorEnvioOrderId: { not: null }, shippingLabelStatus: { notIn: ["DELIVERED", "CANCELLED"] } },
    select: { id: true, melhorEnvioOrderId: true }, orderBy: { shippingLastSyncAt: { sort: "asc", nulls: "first" } }, take: limit,
  });
  let synced = 0;
  for (const order of orders) {
    if (!order.melhorEnvioOrderId) continue;
    try {
      const response = await melhorEnvioFetch(`/api/v2/me/orders/${encodeURIComponent(order.melhorEnvioOrderId)}`, { method: "GET" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) continue;
      const status = String(data.status || "updated").toLowerCase().replace(/\s+/g, "_");
      const event = `order.${status === "not_delivered" ? "undelivered" : status}`;
      const stamp = data.updated_at || data.delivered_at || data.posted_at || new Date().toISOString();
      await recordShippingEvent({ orderId: order.id, labelId: order.melhorEnvioOrderId, event, status, trackingCode: typeof data.tracking === "string" ? data.tracking : null, trackingUrl: typeof data.tracking_url === "string" ? data.tracking_url.replace("https: //", "https://") : null, occurredAt: new Date(stamp) });
      synced++;
    } catch (error) { console.error(`[Melhor Envio] Falha ao sincronizar pedido ${order.id}:`, error); }
  }
  return synced;
}
