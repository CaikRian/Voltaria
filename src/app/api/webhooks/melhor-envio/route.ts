import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

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
    console.info("[Melhor Envio] Webhook recebido", {
      event: payload?.event ?? "test",
      labelId: payload?.data?.id ?? null,
      status: payload?.data?.status ?? null,
    });
  } catch {
    // O teste de cadastro pode não carregar um evento completo. O endpoint só
    // confirma o recebimento; eventos reais serão JSON assinado.
    console.info("[Melhor Envio] Teste de webhook recebido");
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
