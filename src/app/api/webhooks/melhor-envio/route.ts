import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordShippingEvent } from "@/lib/shipping-events";

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
      const taggedOrderId = Array.isArray(payload?.data?.tags) ? payload.data.tags.find((item: { tag?: unknown }) => typeof item?.tag === "string")?.tag : null;
      const order = await prisma.order.findFirst({ where: { OR: [{ melhorEnvioOrderId: labelId }, ...(taggedOrderId ? [{ id: taggedOrderId }] : [])] } });
      if (order) {
        const trackingCode = typeof payload.data.tracking === "string" ? payload.data.tracking : undefined;
        const trackingUrl = typeof payload.data.tracking_url === "string" ? payload.data.tracking_url.replace("https: //", "https://") : undefined;
        const dateValue = payload.data.delivered_at || payload.data.posted_at || payload.data.generated_at || payload.data.paid_at || payload.data.updated_at || payload.data.created_at;
        if (!order.melhorEnvioOrderId) await prisma.order.update({ where: { id: order.id }, data: { melhorEnvioOrderId: labelId } });
        await recordShippingEvent({ orderId: order.id, labelId, event: String(payload.event || `order.${payload.data.status || "updated"}`), status: typeof payload.data.status === "string" ? payload.data.status : null, trackingCode, trackingUrl, occurredAt: dateValue ? new Date(dateValue) : new Date() });
      }
    }
  } catch (error) {
    // O teste de cadastro pode chegar sem corpo completo. Falhas reais de
    // processamento retornam 500 para acionar as retentativas do Melhor Envio.
    if (!rawBody || error instanceof SyntaxError) {
      console.info("[Melhor Envio] Teste de webhook recebido");
      return NextResponse.json({ received: true }, { status: 200 });
    }
    console.error("[Melhor Envio] Falha ao processar webhook:", error);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
