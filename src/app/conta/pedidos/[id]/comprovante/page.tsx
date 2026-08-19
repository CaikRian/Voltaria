import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Payment } from "mercadopago";
import { requireUser } from "@/lib/auth-helpers";
import { getOrderForUser } from "@/lib/orders";
import { mpClient, MP_PAYMENT_METHOD_LABELS } from "@/lib/mercadopago";
import { formatBRL } from "@/lib/format";
import { PrintReceiptButton } from "./PrintReceiptButton";

export const metadata: Metadata = { title: "Comprovante de pagamento" };

type Params = Promise<{ id: string }>;

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "long",
    timeStyle: "short",
  });
}

export default async function PaymentReceiptPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser();
  const order = await getOrderForUser(id, user.id);
  if (!order?.mpPaymentId) notFound();

  const payment = await new Payment(mpClient).get({ id: order.mpPaymentId }).catch(() => null);

  // Além de o pedido pertencer ao usuário logado, o pagamento precisa apontar
  // de volta para esse mesmo pedido. Não exibimos dados em caso de divergência.
  if (!payment || payment.external_reference !== order.id) notFound();

  const paidCents = Math.round((payment.transaction_amount ?? 0) * 100);
  const paymentType = payment.payment_type_id ?? order.mpPaymentMethod ?? "";
  const paymentTypeLabel = MP_PAYMENT_METHOD_LABELS[paymentType] ?? (paymentType || "—");
  const cardLastFour = payment.card?.last_four_digits;

  return (
    <div className="container-x py-10 print:max-w-none print:px-0 print:py-0">
      <style>{`@media print { header, footer, .no-print { display: none !important; } @page { margin: 16mm; } }`}</style>

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/conta/pedidos/${order.id}`} className="text-sm text-brand hover:underline">
          ← Voltar para o pedido
        </Link>
        <PrintReceiptButton />
      </div>

      <main className="mx-auto max-w-3xl rounded-xl2 border border-line bg-paper p-6 sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div>
            <p className="font-display text-2xl font-semibold">Heca - Store</p>
            <p className="mt-1 text-sm text-ink-muted">Comprovante de pagamento</p>
          </div>
          <div className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
            {payment.status === "approved" ? "Pagamento aprovado" : `Status: ${payment.status ?? "—"}`}
          </div>
        </div>

        <section className="grid gap-5 border-b border-line py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-ink-muted">Pedido</p>
            <p className="mt-1 font-mono font-medium">#{order.id.slice(-8)}</p>
          </div>
          <div>
            <p className="text-ink-muted">ID do pagamento Mercado Pago</p>
            <p className="mt-1 break-all font-mono font-medium">{payment.id}</p>
          </div>
          <div>
            <p className="text-ink-muted">Cliente</p>
            <p className="mt-1 font-medium">{order.shipName || user.name || order.email}</p>
            <p className="text-ink-soft">{order.email}</p>
          </div>
          <div>
            <p className="text-ink-muted">Data da aprovação</p>
            <p className="mt-1 font-medium">{formatDate(payment.date_approved)}</p>
          </div>
          <div>
            <p className="text-ink-muted">Forma de pagamento</p>
            <p className="mt-1 font-medium">
              {paymentTypeLabel}
              {payment.payment_method_id ? ` · ${payment.payment_method_id.toUpperCase()}` : ""}
              {cardLastFour ? ` · final ${cardLastFour}` : ""}
            </p>
          </div>
          <div>
            <p className="text-ink-muted">Parcelas</p>
            <p className="mt-1 font-medium">{payment.installments ? `${payment.installments}x` : "—"}</p>
          </div>
          {payment.authorization_code && (
            <div>
              <p className="text-ink-muted">Código de autorização</p>
              <p className="mt-1 font-mono font-medium">{payment.authorization_code}</p>
            </div>
          )}
        </section>

        <section className="py-6">
          <p className="mb-3 text-sm font-medium">Itens da compra</p>
          <ul className="divide-y divide-line text-sm">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-3">
                <span>
                  {item.productName}{item.variantName ? ` (${item.variantName})` : ""} × {item.qty}
                </span>
                <span className="whitespace-nowrap font-medium">
                  {formatBRL(item.unitCents * item.qty)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t-2 border-ink pt-4 text-lg font-semibold">
            <span>Total confirmado</span>
            <span>{formatBRL(paidCents || order.totalCents)}</span>
          </div>
        </section>

        <div className="border-t border-line pt-5 text-xs leading-relaxed text-ink-muted">
          <p>
            Dados financeiros consultados diretamente na API do Mercado Pago no momento da
            visualização. O ID acima permite identificar a transação.
          </p>
          <p className="mt-2">
            Este documento é um comprovante comercial de pagamento e não substitui nota fiscal.
            O comprovante bancário original também pode ser consultado pelo comprador no aplicativo
            ou instituição utilizada para pagar.
          </p>
          <p className="mt-3">Emitido em {formatDate(new Date())}</p>
        </div>
      </main>
    </div>
  );
}
