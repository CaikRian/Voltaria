import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Payment } from "mercadopago";
import { requireUser } from "@/lib/auth-helpers";
import { getOrderForUser } from "@/lib/orders";
import { mpClient } from "@/lib/mercadopago";
import { PaymentReceiptCard } from "@/components/PaymentReceiptCard";
import { PrintReceiptButton } from "@/components/PrintReceiptButton";

export const metadata: Metadata = { title: "Comprovante de pagamento" };

type Params = Promise<{ id: string }>;

export default async function PaymentReceiptPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser();
  const order = await getOrderForUser(id, user.id);
  if (!order?.mpPaymentId) notFound();

  const payment = await new Payment(mpClient).get({ id: order.mpPaymentId }).catch(() => null);

  // Além de o pedido pertencer ao usuário logado, o pagamento precisa apontar
  // de volta para esse mesmo pedido. Não exibimos dados em caso de divergência.
  if (!payment || payment.external_reference !== order.id) notFound();

  return (
    <div className="container-x py-10 print:max-w-none print:px-0 print:py-0">
      <style>{`@media print { header, footer, .no-print { display: none !important; } @page { margin: 16mm; } }`}</style>

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/conta/pedidos/${order.id}`} className="text-sm text-brand hover:underline">
          ← Voltar para o pedido
        </Link>
        <PrintReceiptButton />
      </div>

      <PaymentReceiptCard
        variant="customer"
        orderId={order.id}
        customerName={order.shipName || user.name || order.email}
        customerEmail={order.email}
        items={order.items}
        totalCents={order.totalCents}
        payment={payment}
        orderDetails={{
          status: order.status,
          createdAt: order.createdAt,
          shippingCents: order.shippingCents,
          shippingMethod: order.shippingMethod,
          shippingProvider: order.shippingProvider,
          shipName: order.shipName,
          shipStreet: order.shipStreet,
          shipNumber: order.shipNumber,
          shipComplement: order.shipComplement,
          shipNeighborhood: order.shipNeighborhood,
          shipCity: order.shipCity,
          shipState: order.shipState,
          shipCep: order.shipCep,
          refundedCents: order.refundedCents,
          paymentChoice: order.paymentChoice,
          discountCents: order.discountCents,
          returns: order.returnRequests,
        }}
      />
    </div>
  );
}
