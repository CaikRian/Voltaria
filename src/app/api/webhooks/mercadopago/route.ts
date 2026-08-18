import { NextRequest, NextResponse } from "next/server";
import { Payment, WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";
import { getOrderById, updateOrderStatus } from "@/lib/orders";
import { mpClient } from "@/lib/mercadopago";
import { mapMercadoPagoStatusToOrderStatus } from "@/lib/order-status";

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

  // 2) Busca o pagamento de verdade na API da MP — nunca confia no corpo do webhook.
  let payment;
  try {
    console.log(`[MP Webhook] Buscando dados do pagamento ${dataId} na Mercado Pago...`);
    payment = await new Payment(mpClient).get({ id: dataId });
    console.log(`[MP Webhook] Pagamento encontrado - status: ${payment.status}`);
  } catch (e) {
    console.error(`[MP Webhook] Falha ao buscar pagamento ${dataId}:`, e);
    return NextResponse.json({ error: "falha ao consultar pagamento" }, { status: 500 }); // MP tenta de novo
  }

  const orderId = payment.external_reference;
  if (!orderId) {
    console.warn(
      `[MP Webhook] Pagamento ${dataId} sem external_reference — ignorando`
    );
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    console.warn(
      `[MP Webhook] Pedido ${orderId} não encontrado para pagamento ${dataId}`
    );
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 3) Atualiza o pedido de forma idempotente: sempre grava o estado ATUAL buscado
  // na MP, então reprocessar a mesma notificação nunca regride o status. O evento
  // na linha do tempo só é criado se o status realmente mudou (guarda dentro de
  // updateOrderStatus), evitando duplicar entradas em notificações repetidas.
  const newStatus = mapMercadoPagoStatusToOrderStatus(payment.status ?? "");

  console.log(
    `[MP Webhook] Atualizando pedido ${orderId}: ${order.status} → ${newStatus}`
  );

  await updateOrderStatus(order.id, order.status, newStatus, {
    note: payment.status_detail ?? undefined,
    orderData: {
      mpPaymentId: String(payment.id),
      mpPaymentMethod: payment.payment_type_id ?? null,
      mpStatusDetail: payment.status_detail ?? null,
    },
  });

  console.log(`[MP Webhook] Pedido ${orderId} atualizado com sucesso`);

  return NextResponse.json({ received: true }, { status: 200 });
}
