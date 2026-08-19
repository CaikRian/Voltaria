import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Payment } from "mercadopago";
import { getAdminOrderReceipt } from "@/lib/admin";
import { requireStaff } from "@/lib/auth-helpers";
import { mpClient } from "@/lib/mercadopago";
import { PaymentReceiptCard } from "@/components/PaymentReceiptCard";
import { PrintReceiptButton } from "@/components/PrintReceiptButton";

export const metadata: Metadata = { title: "Comprovante · Painel" };

type Params = Promise<{ id: string }>;

export default async function PainelPaymentReceiptPage({ params }: { params: Params }) {
  await requireStaff();
  const { id } = await params;
  const order = await getAdminOrderReceipt(id);
  if (!order?.mpPaymentId) notFound();

  const payment = await new Payment(mpClient).get({ id: order.mpPaymentId }).catch(() => null);
  if (!payment || payment.external_reference !== order.id) notFound();

  return (
    <div className="container-x py-10 print:max-w-none print:px-0 print:py-0">
      <style>{`@media print { header, footer, .no-print { display: none !important; } @page { margin: 16mm; } }`}</style>

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/painel/pedidos/${order.id}`} className="text-sm text-brand hover:underline">
          ← Voltar para o pedido
        </Link>
        <PrintReceiptButton />
      </div>

      <PaymentReceiptCard
        variant="staff"
        orderId={order.id}
        customerName={order.shipName || order.email}
        customerEmail={order.email}
        items={order.items}
        totalCents={order.totalCents}
        payment={payment}
        accountCpf={order.user?.cpf}
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
          trackingCode: order.trackingCode,
          trackingUrl: order.trackingUrl,
          shippingLabelStatus: order.shippingLabelStatus,
          refundedCents: order.refundedCents,
          returns: order.returnRequests,
          shippingEvents: order.shippingEvents,
        }}
      />
    </div>
  );
}
