import { NextRequest, NextResponse } from "next/server";
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";
import { reconcilePaymentStatus } from "@/lib/orders";

// Rota pública por natureza — é a Mercado Pago quem chama, não um usuário
// logado. Não está (nem precisa estar) no matcher do middleware.ts.
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id");
  const type = url.searchParams.get("type");

  // O Feed v2.0/IPN legado usa `id` + `topic`. Embora possa enviar o header
  // x-signature, essa assinatura não é validável com o segredo dos Webhooks.
  // Apenas confirmamos o recebimento para não misturar os dois protocolos.
  const isLegacyIpn =
    !dataId &&
    !type &&
    url.searchParams.has("id") &&
    url.searchParams.has("topic");

  if (isLegacyIpn) {
    console.warn("[MP Webhook] Notificação IPN/Feed v2.0 legada ignorada");
    return NextResponse.json({ received: true, legacy: true }, { status: 200 });
  }

  // Só nos interessam notificações de pagamento; outras (ex. merchant_order) são ignoradas.
  if (type !== "payment" || !dataId) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 1) Valida a assinatura (x-signature) contra MP_WEBHOOK_SECRET.
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: req.headers.get("x-signature"),
        xRequestId: req.headers.get("x-request-id"),
        dataId,
        secret,
      });
      console.log(`[MP Webhook] Assinatura validada para pagamento ${dataId}`);
    } catch (e) {
      if (e instanceof InvalidWebhookSignatureError) {
        console.error(`[MP Webhook] Assinatura inválida para ${dataId}:`, e.reason);
        const payload = await req.json().catch(() => null);
        console.error("[MP Webhook DIAG]", {
          applicationId: payload?.application_id ?? null,
          userId: payload?.user_id ?? null,
          liveMode: payload?.live_mode ?? null,
          action: payload?.action ?? null,
          requestId: req.headers.get("x-request-id"),
          signatureFailure: e.reason,
        });
        return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
      }
      throw e;
    }
  } else {
    // MP_WEBHOOK_SECRET ainda vazio no .env (webhook não registrado no painel da MP
    // ainda). Só tolerável em dev local — configure o segredo antes de testar de verdade.
    console.warn(
      "[MP Webhook] MP_WEBHOOK_SECRET não configurado — pulando validação de assinatura."
    );
  }

  // 2) Busca o pagamento de verdade na API da MP e atualiza o pedido — nunca
  // confia no corpo/query do webhook, só usa dataId como chave de busca.
  // Reprocessar a mesma notificação é seguro (idempotente): sempre grava o
  // status ATUAL da MP, e só cria evento na linha do tempo se ele mudou de fato.
  try {
    console.log(`[MP Webhook] Reconciliando pagamento ${dataId}...`);
    const result = await reconcilePaymentStatus(dataId);
    if (!result) {
      console.warn(`[MP Webhook] Pagamento ${dataId} sem pedido correspondente — ignorando`);
      return NextResponse.json({ received: true }, { status: 200 });
    }
    console.log(`[MP Webhook] Pedido ${result.orderId} atualizado para ${result.status}`);
  } catch (e) {
    console.error(`[MP Webhook] Falha ao reconciliar pagamento ${dataId}:`, e);
    return NextResponse.json({ error: "falha ao consultar pagamento" }, { status: 500 }); // MP tenta de novo
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
