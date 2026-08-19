"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-helpers";
import { melhorEnvioFetch } from "@/lib/melhor-envio";
import { recordShippingEvent } from "@/lib/shipping-events";

export type ShippingActionState = { success?: boolean; error?: string };

function digits(value?: string | null) { return (value || "").replace(/\D/g, ""); }
function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configure ${name} na Vercel antes de comprar a etiqueta.`);
  return value;
}
function refresh(orderId: string) {
  revalidatePath(`/painel/pedidos/${orderId}`);
  revalidatePath(`/conta/pedidos/${orderId}`);
  revalidatePath("/painel/pedidos");
}
async function apiJson(path: string, init: RequestInit) {
  const response = await melhorEnvioFetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data?.message === "string" ? data.message : typeof data?.error === "string" ? data.error : JSON.stringify(data).slice(0, 700);
    throw new Error(`Melhor Envio (${response.status}): ${detail}`);
  }
  return data;
}

function sender() {
  const document = digits(process.env.MELHOR_ENVIO_SENDER_DOCUMENT);
  const companyDocument = digits(process.env.MELHOR_ENVIO_SENDER_COMPANY_DOCUMENT);
  if (!document && !companyDocument) throw new Error("Configure o CPF ou CNPJ do remetente no ambiente.");
  return {
    name: requiredEnv("MELHOR_ENVIO_SENDER_NAME"), email: requiredEnv("MELHOR_ENVIO_SENDER_EMAIL"),
    phone: digits(requiredEnv("MELHOR_ENVIO_SENDER_PHONE")),
    ...(companyDocument ? { company_document: companyDocument, state_register: process.env.MELHOR_ENVIO_SENDER_STATE_REGISTER?.trim() || "ISENTO" } : { document }),
    address: requiredEnv("MELHOR_ENVIO_SENDER_ADDRESS"), complement: process.env.MELHOR_ENVIO_SENDER_COMPLEMENT?.trim() || "",
    number: requiredEnv("MELHOR_ENVIO_SENDER_NUMBER"), district: requiredEnv("MELHOR_ENVIO_SENDER_DISTRICT"),
    city: requiredEnv("MELHOR_ENVIO_SENDER_CITY"), postal_code: digits(requiredEnv("MELHOR_ENVIO_ORIGIN_CEP")),
    state_abbr: requiredEnv("MELHOR_ENVIO_SENDER_STATE").toUpperCase(),
  };
}

export async function buyShippingLabelAction(orderId: string, _prev: ShippingActionState, formData: FormData): Promise<ShippingActionState> {
  await requireCapability("order:update:status");
  try {
    const invoiceKey = digits(String(formData.get("invoiceKey") || ""));
    if (invoiceKey.length !== 44) return { error: "Informe a chave de acesso da nota fiscal com 44 dígitos." };
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: { select: { phone: true, cpf: true } } },
    });
    if (!order) return { error: "Pedido não encontrado." };
    if (!["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO"].includes(order.status)) return { error: "A etiqueta só pode ser comprada após o pagamento e antes do envio." };
    if (!order.shippingServiceId || order.shippingProvider !== "MELHOR_ENVIO") return { error: "Este pedido não possui um serviço válido do Melhor Envio." };
    const phone = digits(String(formData.get("recipientPhone") || "") || order.shipPhone || order.user?.phone);
    const document = digits(String(formData.get("recipientDocument") || "") || order.shipDocument || order.user?.cpf);
    if (!/^\d{10,11}$/.test(phone) || !/^\d{11}$/.test(document)) return { error: "Telefone e CPF válidos do destinatário são obrigatórios. Pedidos antigos precisam ser corrigidos antes da etiqueta." };
    if (!order.shipName || !order.shipCep || !order.shipStreet || !order.shipNumber || !order.shipNeighborhood || !order.shipCity || !order.shipState) return { error: "O endereço de entrega está incompleto." };

    let labelId = order.melhorEnvioOrderId;
    if (!labelId) {
      const productIds = [...new Set(order.items.map((item) => item.productId))];
      const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, weightGrams: true, widthCm: true, heightCm: true, lengthCm: true } });
      if (products.length !== productIds.length) return { error: "Um produto do pedido não existe mais no catálogo." };
      const quoteProducts = order.items.map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId)!;
        return { id: item.id, width: product.widthCm, height: product.heightCm, length: product.lengthCm, weight: product.weightGrams / 1000, insurance_value: Number((item.unitCents / 100).toFixed(2)), quantity: item.qty };
      });
      const quotes = await apiJson("/api/v2/me/shipment/calculate", { method: "POST", body: JSON.stringify({ from: { postal_code: digits(requiredEnv("MELHOR_ENVIO_ORIGIN_CEP")) }, to: { postal_code: digits(order.shipCep) }, products: quoteProducts, options: { receipt: false, own_hand: false } }) });
      const quote = Array.isArray(quotes) ? quotes.find((item) => String(item.id) === order.shippingServiceId) : null;
      if (!quote || quote.error) return { error: "O serviço escolhido no checkout não está mais disponível. Faça uma nova cotação com a transportadora." };
      const labelCostCents = Math.round(Number(quote.custom_price ?? quote.price) * 100);
      if (labelCostCents > (order.shippingCents || 0) && formData.get("acceptDifference") !== "on") return { error: `O frete agora custa R$ ${(labelCostCents / 100).toFixed(2)}, acima dos R$ ${((order.shippingCents || 0) / 100).toFixed(2)} cobrados. Marque a confirmação para assumir a diferença.` };
      const volumes = Array.isArray(quote.packages) && quote.packages.length
        ? quote.packages.map((pack: any) => ({ height: pack.dimensions.height, width: pack.dimensions.width, length: pack.dimensions.length, weight: Number(pack.weight) }))
        : quoteProducts.map((product) => ({ height: product.height, width: product.width, length: product.length, weight: product.weight * product.quantity }));
      const cart = await apiJson("/api/v2/me/cart", { method: "POST", body: JSON.stringify({
        service: Number(order.shippingServiceId), from: sender(),
        to: { name: order.shipName, email: order.email, phone, document, state_register: "ISENTO", address: order.shipStreet, complement: order.shipComplement || "", number: order.shipNumber, district: order.shipNeighborhood, city: order.shipCity, postal_code: digits(order.shipCep), country_id: "BR", state_abbr: order.shipState },
        products: order.items.map((item) => ({ name: item.variantName ? `${item.productName} - ${item.variantName}` : item.productName, quantity: String(item.qty), unitary_value: (item.unitCents / 100).toFixed(2) })),
        volumes, options: { platform: "Heca - Store", reminder: `Pedido ${order.id.slice(-8)}`, insurance_value: Number(((order.totalCents - (order.shippingCents || 0)) / 100).toFixed(2)), receipt: false, own_hand: false, reverse: false, invoice: { key: invoiceKey }, tags: [{ tag: order.id, url: `${requiredEnv("APP_URL")}/painel/pedidos/${order.id}` }] },
      }) });
      labelId = String(cart.id || "");
      if (!labelId) throw new Error("Melhor Envio não retornou o ID da etiqueta.");
      await prisma.order.update({ where: { id: order.id }, data: { melhorEnvioOrderId: labelId, shipPhone: phone, shipDocument: document, shippingLabelStatus: "CART", shippingInvoiceKey: invoiceKey, shippingLabelCostCents: labelCostCents, shippingLabelError: null } });
      await recordShippingEvent({ orderId: order.id, labelId, event: "order.created", status: "pending" });
    }
    await apiJson("/api/v2/me/shipment/checkout", { method: "POST", body: JSON.stringify({ orders: [labelId] }) });
    await prisma.order.update({ where: { id: order.id }, data: { shippingLabelStatus: "PURCHASED", shippingLabelPurchasedAt: new Date(), shippingLabelError: null } });
    await recordShippingEvent({ orderId: order.id, labelId, event: "order.released", status: "released" });
    refresh(order.id);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida ao comprar etiqueta.";
    await prisma.order.update({ where: { id: orderId }, data: { shippingLabelError: message, shippingNeedsAttention: true } }).catch(() => {});
    refresh(orderId);
    return { error: message };
  }
}

export async function generateShippingLabelAction(orderId: string, _prev: ShippingActionState): Promise<ShippingActionState> {
  await requireCapability("order:update:status");
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { melhorEnvioOrderId: true, shippingLabelStatus: true } });
    if (!order?.melhorEnvioOrderId) return { error: "Compre a etiqueta primeiro." };
    await apiJson("/api/v2/me/shipment/generate", { method: "POST", body: JSON.stringify({ orders: [order.melhorEnvioOrderId] }) });
    await prisma.order.update({ where: { id: orderId }, data: { shippingLabelStatus: "GENERATED", shippingLabelGeneratedAt: new Date(), shippingLabelError: null } });
    await recordShippingEvent({ orderId, labelId: order.melhorEnvioOrderId, event: "order.generated", status: "generated" });
    refresh(orderId); return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar etiqueta.";
    await prisma.order.update({ where: { id: orderId }, data: { shippingLabelError: message, shippingNeedsAttention: true } }).catch(() => {});
    refresh(orderId); return { error: message };
  }
}

export async function printShippingLabelAction(orderId: string, _prev: ShippingActionState): Promise<ShippingActionState> {
  await requireCapability("order:update:status");
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { melhorEnvioOrderId: true } });
    if (!order?.melhorEnvioOrderId) return { error: "Etiqueta não encontrada." };
    const result = await apiJson("/api/v2/me/shipment/print", { method: "POST", body: JSON.stringify({ mode: "public", orders: [order.melhorEnvioOrderId] }) });
    const url = typeof result.url === "string" ? result.url : typeof result === "string" ? result : null;
    if (!url) throw new Error("Melhor Envio não retornou o link de impressão.");
    await prisma.order.update({ where: { id: orderId }, data: { shippingLabelUrl: url, shippingLabelError: null } });
    refresh(orderId); return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao obter impressão.";
    await prisma.order.update({ where: { id: orderId }, data: { shippingLabelError: message, shippingNeedsAttention: true } }).catch(() => {});
    refresh(orderId); return { error: message };
  }
}

export async function syncShippingTrackingAction(orderId: string, _prev: ShippingActionState): Promise<ShippingActionState> {
  await requireCapability("order:update:status");
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { melhorEnvioOrderId: true } });
    if (!order?.melhorEnvioOrderId) return { error: "Este pedido ainda não possui etiqueta vinculada." };
    const data = await apiJson(`/api/v2/me/orders/${encodeURIComponent(order.melhorEnvioOrderId)}`, { method: "GET" });
    const status = String(data.status || "updated").toLowerCase().replace(/\s+/g, "_");
    const event = `order.${status === "not_delivered" ? "undelivered" : status}`;
    const trackingCode = typeof data.tracking === "string" ? data.tracking : null;
    const trackingUrl = typeof data.tracking_url === "string" ? data.tracking_url.replace("https: //", "https://") : null;
    const stamp = data.updated_at || data.delivered_at || data.posted_at || new Date().toISOString();
    await recordShippingEvent({ orderId, labelId: order.melhorEnvioOrderId, event, status, trackingCode, trackingUrl, occurredAt: new Date(stamp) });
    refresh(orderId); return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sincronizar rastreamento.";
    refresh(orderId); return { error: message };
  }
}
