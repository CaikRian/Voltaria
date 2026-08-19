"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireCapability } from "@/lib/auth-helpers";

export type ReturnActionState = { success?: boolean; error?: string; fieldErrors?: Record<string, string[]> };

const ACTIVE = ["REQUESTED", "APPROVED", "AWAITING_SHIPMENT", "IN_TRANSIT", "RECEIVED", "INSPECTED", "REFUND_PROCESSING", "REFUND_FAILED"];
const REASONS = new Set(["ARREPENDIMENTO", "DEFEITO", "DANIFICADO", "ITEM_INCORRETO", "INCOMPLETO", "OUTRO"]);

function refresh(orderId: string) {
  revalidatePath(`/conta/pedidos/${orderId}`);
  revalidatePath(`/painel/pedidos/${orderId}`);
  revalidatePath("/painel/pedidos");
}

export async function createReturnRequestAction(orderId: string, _prev: ReturnActionState, formData: FormData): Promise<ReturnActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Você precisa estar logado." };
  const category = String(formData.get("reasonCategory") || "");
  const details = String(formData.get("reasonDetails") || "").trim();
  if (!REASONS.has(category)) return { fieldErrors: { reasonCategory: ["Selecione o motivo da devolução."] } };
  if (details.length < 10) return { fieldErrors: { reasonDetails: ["Explique o ocorrido com pelo menos 10 caracteres."] } };
  if (details.length > 2000) return { fieldErrors: { reasonDetails: ["Use no máximo 2.000 caracteres."] } };

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { items: true, statusEvents: { where: { status: "ENTREGUE" }, orderBy: { createdAt: "desc" }, take: 1 }, returnRequests: { where: { status: { in: ACTIVE } }, include: { items: true } } },
  });
  if (!order) return { error: "Pedido não encontrado." };
  if (order.status !== "ENTREGUE") return { error: "A devolução fica disponível após a confirmação da entrega." };
  if (!order.mpPaymentId) return { error: "O pagamento deste pedido ainda não pode ser reembolsado automaticamente." };
  const deliveredAt = order.statusEvents[0]?.createdAt;
  if (category === "ARREPENDIMENTO" && deliveredAt && Date.now() - deliveredAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
    return { error: "O prazo legal de 7 dias corridos para arrependimento terminou. Se houver defeito ou outra ocorrência, selecione o motivo correspondente para análise." };
  }

  const selected = order.items.map((item) => ({ item, qty: Number(formData.get(`qty_${item.id}`) || 0) })).filter((entry) => Number.isInteger(entry.qty) && entry.qty > 0);
  if (!selected.length) return { error: "Selecione ao menos um item e a quantidade." };
  for (const entry of selected) {
    const alreadyRequested = order.returnRequests.flatMap((request) => request.items).filter((item) => item.orderItemId === entry.item.id).reduce((sum, item) => sum + item.qty, 0);
    if (entry.qty + alreadyRequested > entry.item.qty) return { error: `A quantidade solicitada para ${entry.item.productName} excede a quantidade disponível.` };
  }

  const evidenceUrls = String(formData.get("evidenceUrls") || "").split(/\r?\n|,/).map((url) => url.trim()).filter(Boolean);
  if (evidenceUrls.some((url) => !/^https:\/\//i.test(url))) return { fieldErrors: { evidenceUrls: ["Cada evidência deve ser um link HTTPS válido."] } };
  const requestedCents = selected.reduce((sum, entry) => sum + entry.item.unitCents * entry.qty, 0);

  await prisma.returnRequest.create({
    data: {
      orderId, userId: user.id, reasonCategory: category, reasonDetails: details,
      evidenceUrls: evidenceUrls.length ? JSON.stringify(evidenceUrls.slice(0, 8)) : null,
      requestedCents, idempotencyKey: `return-${randomUUID()}`,
      items: { create: selected.map(({ item, qty }) => ({ orderItemId: item.id, qty, unitCents: item.unitCents })) },
      events: { create: { status: "REQUESTED", note: "Solicitação enviada pelo cliente.", actorId: user.id, actorName: user.name || user.email, actorRole: user.role } },
    },
  });
  refresh(orderId);
  return { success: true };
}

export async function markReturnShippedAction(returnId: string, _prev: ReturnActionState, formData: FormData): Promise<ReturnActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Você precisa estar logado." };
  const code = String(formData.get("trackingCode") || "").trim();
  if (code.length < 5) return { error: "Informe o código de postagem/rastreio." };
  const request = await prisma.returnRequest.findFirst({ where: { id: returnId, userId: user.id }, select: { id: true, orderId: true, status: true } });
  if (!request || !["APPROVED", "AWAITING_SHIPMENT"].includes(request.status)) return { error: "Esta devolução não está aguardando postagem." };
  await prisma.returnRequest.update({ where: { id: returnId }, data: { status: "IN_TRANSIT", reverseTrackingCode: code, shippedAt: new Date(), events: { create: { status: "IN_TRANSIT", note: `Postagem informada: ${code}`, actorId: user.id, actorName: user.name || user.email, actorRole: user.role } } } });
  refresh(request.orderId);
  return { success: true };
}

export async function reviewReturnAction(returnId: string, _prev: ReturnActionState, formData: FormData): Promise<ReturnActionState> {
  const actor = await requireCapability("return:manage");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim();
  const instructions = String(formData.get("reverseInstructions") || "").trim();
  const request = await prisma.returnRequest.findUnique({ where: { id: returnId }, select: { orderId: true, status: true } });
  if (!request || request.status !== "REQUESTED") return { error: "Solicitação já analisada ou inexistente." };
  if (decision === "REJECT" && note.length < 5) return { error: "Informe uma justificativa clara para a recusa." };
  if (decision === "APPROVE" && instructions.length < 10) return { error: "Informe as instruções de devolução ao cliente." };
  if (!["APPROVE", "REJECT"].includes(decision)) return { error: "Decisão inválida." };
  const approved = decision === "APPROVE";
  await prisma.returnRequest.update({ where: { id: returnId }, data: {
    status: approved ? "AWAITING_SHIPMENT" : "REJECTED", reviewedAt: new Date(), reviewedById: actor.id,
    reviewedByName: actor.name || actor.email, staffNote: note || null, rejectionReason: approved ? null : note,
    reverseInstructions: approved ? instructions : null,
    events: { create: { status: approved ? "AWAITING_SHIPMENT" : "REJECTED", note: approved ? "Devolução aprovada; aguardando postagem." : note, actorId: actor.id, actorName: actor.name || actor.email, actorRole: actor.role } },
  } });
  refresh(request.orderId);
  return { success: true };
}

export async function receiveReturnAction(returnId: string, _prev: ReturnActionState): Promise<ReturnActionState> {
  const actor = await requireCapability("return:manage");
  const request = await prisma.returnRequest.findUnique({ where: { id: returnId }, select: { orderId: true, status: true } });
  if (!request || !["IN_TRANSIT", "AWAITING_SHIPMENT"].includes(request.status)) return { error: "A devolução não está apta para recebimento." };
  await prisma.returnRequest.update({ where: { id: returnId }, data: { status: "RECEIVED", receivedAt: new Date(), events: { create: { status: "RECEIVED", note: "Pacote recebido pela equipe.", actorId: actor.id, actorName: actor.name || actor.email, actorRole: actor.role } } } });
  refresh(request.orderId);
  return { success: true };
}

export async function inspectReturnAction(returnId: string, _prev: ReturnActionState, formData: FormData): Promise<ReturnActionState> {
  const actor = await requireCapability("return:manage");
  const request = await prisma.returnRequest.findUnique({ where: { id: returnId }, include: { items: { include: { orderItem: true } }, order: { select: { shippingCents: true, totalCents: true, refundedCents: true } } } });
  if (!request || request.status !== "RECEIVED") return { error: "Primeiro confirme o recebimento do pacote." };
  const fullItemReturn = request.requestedCents === request.order.totalCents - (request.order.shippingCents || 0);
  // No arrependimento integral dentro do prazo legal, todos os valores pagos
  // devem ser devolvidos; a equipe não pode retirar o frete por engano.
  const includeShipping = formData.get("includeShipping") === "on" || (request.reasonCategory === "ARREPENDIMENTO" && fullItemReturn);
  let itemsApproved = 0;
  for (const item of request.items) {
    const condition = String(formData.get(`condition_${item.id}`) || "");
    if (!["SEALED", "SELLABLE", "DAMAGED", "INCOMPLETE", "MISSING"].includes(condition)) return { error: "Registre a condição de todos os itens." };
    itemsApproved += Number(formData.get(`approvedQty_${item.id}`) || item.qty) * item.unitCents;
  }
  const maxRequest = request.requestedCents + (includeShipping ? request.order.shippingCents || 0 : 0);
  const approvedCents = Math.min(itemsApproved + (includeShipping ? request.order.shippingCents || 0 : 0), maxRequest, request.order.totalCents - request.order.refundedCents);
  if (approvedCents <= 0) return { error: "Não há saldo disponível para reembolso." };

  await prisma.$transaction(async (tx) => {
    for (const item of request.items) {
      const condition = String(formData.get(`condition_${item.id}`));
      const shouldRestock = formData.get(`restock_${item.id}`) === "on" && ["SEALED", "SELLABLE"].includes(condition);
      await tx.returnItem.update({ where: { id: item.id }, data: { condition, restockDecision: shouldRestock ? "RESTOCK" : "DO_NOT_RESTOCK" } });
      if (shouldRestock && !item.restockedAt) {
        if (item.orderItem.variantId) await tx.variant.update({ where: { id: item.orderItem.variantId }, data: { stock: { increment: item.qty } } });
        else await tx.product.update({ where: { id: item.orderItem.productId }, data: { stock: { increment: item.qty } } });
        await tx.returnItem.update({ where: { id: item.id }, data: { restockedAt: new Date() } });
      }
    }
    await tx.returnRequest.update({ where: { id: returnId }, data: { status: "INSPECTED", inspectedAt: new Date(), approvedCents, includeShipping, staffNote: String(formData.get("note") || "").trim() || request.staffNote, events: { create: { status: "INSPECTED", note: `Inspeção concluída. Reembolso aprovado: R$ ${(approvedCents / 100).toFixed(2)}.`, actorId: actor.id, actorName: actor.name || actor.email, actorRole: actor.role } } } });
  });
  refresh(request.orderId);
  return { success: true };
}

export async function executeRefundAction(returnId: string, _prev: ReturnActionState): Promise<ReturnActionState> {
  const actor = await requireCapability("refund:execute");
  const request = await prisma.returnRequest.findUnique({ where: { id: returnId }, include: { order: true } });
  if (!request || !["INSPECTED", "REFUND_FAILED"].includes(request.status) || !request.approvedCents) return { error: "A devolução precisa estar inspecionada e aprovada." };
  if (!request.order.mpPaymentId) return { error: "Pagamento Mercado Pago não localizado." };
  const remaining = request.order.totalCents - request.order.refundedCents;
  const amount = Math.min(request.approvedCents, remaining);
  if (amount <= 0) return { error: "Este pagamento já foi totalmente reembolsado." };

  const locked = await prisma.returnRequest.updateMany({ where: { id: returnId, status: { in: ["INSPECTED", "REFUND_FAILED"] } }, data: { status: "REFUND_PROCESSING", refundError: null } });
  if (locked.count !== 1) return { error: "O reembolso já está sendo processado." };
  try {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) throw new Error("MP_ACCESS_TOKEN não configurado.");
    const fullRefund = amount === request.order.totalCents && request.order.refundedCents === 0;
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(request.order.mpPaymentId)}/refunds`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": request.idempotencyKey },
      body: fullRefund ? undefined : JSON.stringify({ amount: Number((amount / 100).toFixed(2)) }), cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as { id?: number | string; message?: string; error?: string };
    if (!response.ok || !payload.id) throw new Error(payload.message || payload.error || `Mercado Pago respondeu HTTP ${response.status}.`);
    await prisma.$transaction(async (tx) => {
      const current = await tx.returnRequest.findUnique({ where: { id: returnId }, select: { status: true } });
      if (current?.status === "REFUNDED") return;
      const order = await tx.order.update({ where: { id: request.orderId }, data: { refundedCents: { increment: amount } } });
      await tx.returnRequest.update({ where: { id: returnId }, data: { status: "REFUNDED", mpRefundId: String(payload.id), refundedAt: new Date(), events: { create: { status: "REFUNDED", note: `Reembolso de R$ ${(amount / 100).toFixed(2)} confirmado pelo Mercado Pago.`, actorId: actor.id, actorName: actor.name || actor.email, actorRole: actor.role } } } });
      if (order.refundedCents >= order.totalCents && order.status !== "REEMBOLSADO") {
        await tx.order.update({ where: { id: order.id }, data: { status: "REEMBOLSADO" } });
        await tx.orderStatusEvent.create({ data: { orderId: order.id, status: "REEMBOLSADO", note: "Pagamento integralmente reembolsado pelo Mercado Pago." } });
      }
    });
    refresh(request.orderId);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Falha desconhecida no reembolso.";
    await prisma.returnRequest.update({ where: { id: returnId }, data: { status: "REFUND_FAILED", refundError: message, events: { create: { status: "REFUND_FAILED", note: message, actorId: actor.id, actorName: actor.name || actor.email, actorRole: actor.role } } } });
    refresh(request.orderId);
    return { error: `O dinheiro não foi confirmado: ${message}` };
  }
}
