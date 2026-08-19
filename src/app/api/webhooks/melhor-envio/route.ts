import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/orders";

export const runtime = "nodejs";

function validSignature(body: string, received: string, secret: string) {
  const expected = createHmac("sha256", secret).update(body).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Health check útil para navegador/monitoramento. As notificações reais chegam
// via POST; responder 200 aqui também facilita confirmar que o deploy está ativo.
export async function GET() {
  return NextResponse.json({ ok: true, provider: "melhor-envio" });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-me-signature");
  const secret = process.env.MELHOR_ENVIO_CLIENT_SECRET;

  if (secret && (!signature || !validSignature(rawBody, signature, secret))) {
    console.warn("[Melhor Envio] Webhook com assinatura inválida");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  try {
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const labelId = typeof payload?.data?.id === "string" ? payload.data.id : null;
    console.info("[Melhor Envio] Webhook recebido", {
      event: payload?.event ?? "test",
      labelId,
      status: payload?.data?.status ?? null,
    });
    if (labelId) {
      const order = await prisma.order.findUnique({ where: { melhorEnvioOrderId: labelId } });
      if (order) {
        const trackingCode = typeof payload.data.tracking === "string" ? payload.data.tracking : undefined;
        const trackingUrl = typeof payload.data.tracking_url === "string" ? payload.data.tracking_url.replace("https: //", "https://") : undefined;
        const orderData = { ...(trackingCode ? { trackingCode } : {}), ...(trackingUrl ? { trackingUrl } : {}) };
        if (payload.event === "order.posted" && ["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO"].includes(order.status)) {
          if (order.status === "PAGAMENTO_APROVADO") await updateOrderStatus(order.id, order.status, "PREPARANDO_ENVIO", { note: "Etiqueta liberada pela transportadora", orderData });
          await updateOrderStatus(order.id, "PREPARANDO_ENVIO", "ENVIADO", { note: "Objeto postado na transportadora", orderData });
        } else if (payload.event === "order.delivered" && order.status === "ENVIADO") {
          await updateOrderStatus(order.id, order.status, "ENTREGUE", { note: "Entrega confirmada pela transportadora", orderData });
        } else {
          await prisma.order.update({ where: { id: order.id }, data: orderData });
        }
      }
    }
  } catch {
    // O teste de cadastro pode não carregar um evento completo. O endpoint só
    // confirma o recebimento; eventos reais serão JSON assinado.
    console.info("[Melhor Envio] Teste de webhook recebido");
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
