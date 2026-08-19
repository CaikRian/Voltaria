import type { Metadata } from "next";
import { reconcilePaymentStatus } from "@/lib/orders";
import { OrderStatusView } from "../OrderStatusView";

export const metadata: Metadata = { title: "Pedido confirmado — Heca - Store" };

// A MP manda "payment_id" (novo) ou "collection_id" (legado) no redirect — os
// dois são o mesmo id de pagamento.
type SearchParams = Promise<{ order?: string; payment_id?: string; collection_id?: string }>;

export default async function CheckoutSucessoPage({ searchParams }: { searchParams: SearchParams }) {
  const { order, payment_id, collection_id } = await searchParams;
  const paymentId = payment_id || collection_id;

  // Rede de segurança: reconcilia aqui também, não só no webhook. Se o webhook
  // não chegar por algum motivo, o cliente ainda vê o pedido certo ao voltar do
  // pagamento — sem nunca confiar no "status" da query string em si, só usa o
  // id pra buscar o pagamento de verdade na API da MP (mesma função do webhook).
  if (paymentId) {
    try {
      await reconcilePaymentStatus(paymentId);
    } catch (e) {
      console.error("[Checkout Sucesso] Falha ao reconciliar pagamento (webhook deve corrigir depois):", e);
    }
  }

  return (
    <div className="container-x py-16">
      <OrderStatusView orderId={order} clearCart />
    </div>
  );
}
