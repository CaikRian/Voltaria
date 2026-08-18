import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";
import { reconcilePaymentStatus } from "@/lib/orders";

// Rota pública por natureza — é a Mercado Pago quem chama, não um usuário
// logado. Não está (nem precisa estar) no matcher do middleware.ts.
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic");

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
        // DEBUG TEMPORÁRIO: nunca loga o secret, só os hashes (não são sigilosos) —
        // pra comparar visualmente o que a MP mandou vs. o que a gente calculou.
        // Remover depois de confirmar a causa raiz do SignatureMismatch.
        const rawSignature = req.headers.get("x-signature");
        const rawRequestId = req.headers.get("x-request-id");
        console.error("[MP Webhook DEBUG] x-signature bruto:", rawSignature);
        console.error("[MP Webhook DEBUG] x-request-id bruto:", rawRequestId);
        const tsMatch = rawSignature?.match(/ts=([^,]+)/);
        const v1Match = rawSignature?.match(/v1=([^,]+)/);
        if (tsMatch && v1Match) {
          const manifest = `id:${dataId};request-id:${rawRequestId ?? ""};ts:${tsMatch[1]};`;
          const computed = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
          console.error("[MP Webhook DEBUG] manifest:", manifest);
          console.error("[MP Webhook DEBUG] hash recebido (v1):", v1Match[1]);
          console.error("[MP Webhook DEBUG] hash calculado:", computed);
          console.error("[MP Webhook DEBUG] bateram?", computed === v1Match[1]);
        }
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
