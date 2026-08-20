import "server-only";
import { prisma } from "@/lib/prisma";
import { isBrevoConfigured, sendBrevoEmail } from "@/lib/brevo-email";

type EmailKind =
  | "PAYMENT_APPROVED"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "RETURN_RECEIVED"
  | "REFUND_CONFIRMED"
  | "SHIPPING_ATTENTION";

type EmailOptions = { amountCents?: number; note?: string | null; trackingCode?: string | null; trackingUrl?: string | null };

const COPY: Record<EmailKind, { subject: string; title: string; message: string }> = {
  PAYMENT_APPROVED: { subject: "Pagamento confirmado", title: "Pagamento aprovado!", message: "Recebemos a confirmação do seu pagamento e seu pedido seguirá para preparação." },
  PREPARING: { subject: "Pedido em preparação", title: "Estamos preparando seu pedido", message: "A separação dos produtos começou. Avisaremos assim que o pacote for despachado." },
  SHIPPED: { subject: "Pedido despachado", title: "Seu pedido está a caminho", message: "A transportadora recebeu o pacote. Você já pode acompanhar a entrega." },
  DELIVERED: { subject: "Pedido entregue", title: "Entrega concluída", message: "A transportadora confirmou a entrega. Esperamos que você aproveite sua compra!" },
  CANCELLED: { subject: "Pedido cancelado", title: "Cancelamento confirmado", message: "O pedido foi cancelado. Se houve pagamento, acompanhe as informações de reembolso na sua conta." },
  REFUNDED: { subject: "Pagamento reembolsado", title: "Reembolso concluído", message: "O Mercado Pago confirmou o reembolso integral do pedido." },
  RETURN_REQUESTED: { subject: "Solicitação recebida", title: "Recebemos sua solicitação", message: "Nossa equipe analisará o cancelamento ou a devolução e atualizará você pelo site e por e-mail." },
  RETURN_APPROVED: { subject: "Solicitação aprovada", title: "Sua solicitação foi aprovada", message: "Consulte o pedido para conferir as instruções e os próximos passos." },
  RETURN_REJECTED: { subject: "Atualização da sua solicitação", title: "Solicitação analisada", message: "A análise foi concluída. Consulte o pedido para conferir a justificativa e falar com a equipe, se necessário." },
  RETURN_RECEIVED: { subject: "Devolução recebida", title: "Recebemos sua devolução", message: "O pacote retornou à loja e seguirá para conferência." },
  REFUND_CONFIRMED: { subject: "Reembolso confirmado", title: "Seu reembolso foi realizado", message: "O Mercado Pago confirmou o reembolso. O prazo para aparecer depende do meio de pagamento e da instituição financeira." },
  SHIPPING_ATTENTION: { subject: "Atualização importante da entrega", title: "Sua entrega precisa de atenção", message: "A transportadora informou uma ocorrência. Nossa equipe está acompanhando o envio." },
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export async function sendOrderEmail(orderId: string, kind: EmailKind, options: EmailOptions = {}) {
  if (!isBrevoConfigured()) {
    console.warn(`[E-mail] ${kind} não enviado: BREVO_API_KEY ou EMAIL_FROM ausente.`);
    return false;
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, email: true, shipName: true, totalCents: true, trackingCode: true, trackingUrl: true, items: { select: { productName: true, variantName: true, qty: true } } },
    });
    if (!order) return false;
    const copy = COPY[kind];
    const siteUrl = (process.env.APP_URL || "https://voltaria.vercel.app").replace(/\/$/, "");
    const orderUrl = `${siteUrl}/conta/pedidos/${encodeURIComponent(order.id)}`;
    const trackingCode = options.trackingCode || order.trackingCode;
    const trackingUrl = options.trackingUrl || order.trackingUrl;
    const items = order.items.map((item) => `<li style="margin:6px 0">${item.qty}× ${escapeHtml(item.productName)}${item.variantName ? ` — ${escapeHtml(item.variantName)}` : ""}</li>`).join("");
    const extra = [
      options.amountCents != null ? `<p><strong>Valor:</strong> ${money(options.amountCents)}</p>` : "",
      trackingCode ? `<p><strong>Código de rastreamento:</strong> ${escapeHtml(trackingCode)}</p>` : "",
      options.note ? `<p><strong>Informação:</strong> ${escapeHtml(options.note)}</p>` : "",
    ].join("");
    const html = `<div style="background:#f6f4f8;padding:28px 12px;font-family:Arial,sans-serif;color:#211a27"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #e8e1ec;border-radius:18px;overflow:hidden"><div style="background:#6d28d9;padding:22px 28px;color:#fff"><strong style="font-size:20px">Heca Store</strong></div><div style="padding:28px"><p style="color:#6b6470;margin-top:0">Olá, ${escapeHtml(order.shipName || "cliente")}.</p><h1 style="font-size:25px;margin:10px 0">${copy.title}</h1><p style="line-height:1.6">${copy.message}</p><div style="background:#f7f4fa;border-radius:12px;padding:16px;margin:22px 0"><p style="margin-top:0"><strong>Pedido:</strong> #${escapeHtml(order.id.slice(-8).toUpperCase())}</p><ul style="padding-left:18px;margin-bottom:8px">${items}</ul><p style="margin-bottom:0"><strong>Total da compra:</strong> ${money(order.totalCents)}</p>${extra}</div>${trackingUrl ? `<p><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#0f766e;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Rastrear entrega</a></p>` : ""}<p><a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#6d28d9;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Ver detalhes do pedido</a></p><p style="font-size:12px;color:#777;margin-top:26px">Este é um aviso automático sobre uma compra realizada na Heca Store. Não é uma mensagem promocional.</p></div></div></div>`;

    const response = await sendBrevoEmail({ to: order.email, toName: order.shipName, subject: `${copy.subject} · Pedido #${order.id.slice(-8).toUpperCase()}`, html });
    if (!response.ok) throw new Error(response.error);
    return true;
  } catch (error) {
    console.error(`[E-mail] Falha ao enviar ${kind} do pedido ${orderId}:`, error);
    return false;
  }
}

export function emailKindForOrderStatus(status: string): EmailKind | null {
  return ({ PAGAMENTO_APROVADO: "PAYMENT_APPROVED", PREPARANDO_ENVIO: "PREPARING", ENVIADO: "SHIPPED", ENTREGUE: "DELIVERED", CANCELADO: "CANCELLED", REEMBOLSADO: "REFUNDED" } as Record<string, EmailKind>)[status] ?? null;
}
