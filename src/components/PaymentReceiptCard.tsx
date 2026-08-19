import { formatBRL } from "@/lib/format";
import { MP_PAYMENT_METHOD_LABELS } from "@/lib/mercadopago";

// Só os campos do retorno da Payment API que a gente realmente usa — evita
// depender do caminho de import interno dos tipos do SDK da Mercado Pago.
export type ReceiptPayment = {
  id?: number | string;
  status?: string;
  status_detail?: string;
  live_mode?: boolean;
  date_created?: string;
  date_approved?: string;
  transaction_amount?: number;
  payment_type_id?: string;
  payment_method_id?: string;
  installments?: number;
  authorization_code?: string;
  net_amount?: number;
  card?: {
    first_six_digits?: string;
    last_four_digits?: string;
    cardholder?: { name?: string };
  };
  payer?: {
    email?: string;
    identification?: { type?: string; number?: string };
  };
  point_of_interaction?: {
    transaction_data?: { transaction_id?: string };
  };
  transaction_details?: {
    net_received_amount?: number;
  };
  money_release_date?: string;
  money_release_status?: string;
};

type ReceiptItem = { id: string; productName: string; variantName?: string | null; unitCents: number; qty: number };

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" });
}

// Mascara um documento (CPF/CNPJ) deixando só os 2 últimos dígitos visíveis —
// mesma lógica de minimização de dado usada no perfil do cliente no painel.
function maskDocument(number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.length <= 2) return "••";
  return `${"•".repeat(digits.length - 2)}${digits.slice(-2)}`;
}

export function PaymentReceiptCard({
  variant,
  orderId,
  customerName,
  customerEmail,
  items,
  totalCents,
  payment,
  accountCpf,
}: {
  variant: "customer" | "staff";
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: ReceiptItem[];
  totalCents: number;
  payment: ReceiptPayment;
  accountCpf?: string | null;
}) {
  const paidCents = Math.round((payment.transaction_amount ?? 0) * 100);
  const paymentType = payment.payment_type_id ?? "";
  const paymentTypeLabel = MP_PAYMENT_METHOD_LABELS[paymentType] ?? (paymentType || "—");
  const card = payment.card;
  const cardNumberMasked = card?.first_six_digits && card?.last_four_digits
    ? `${card.first_six_digits} •• •••• ${card.last_four_digits}`
    : card?.last_four_digits
      ? `•••• ${card.last_four_digits}`
      : null;
  const pixTransactionId = payment.point_of_interaction?.transaction_data?.transaction_id;
  const payerDoc = payment.payer?.identification;
  const payerDocNumber = payerDoc?.number ? (variant === "staff" ? maskDocument(payerDoc.number) : payerDoc.number) : null;
  const docMatchesAccount =
    variant === "staff" && accountCpf && payerDoc?.type === "CPF" && payerDoc.number
      ? accountCpf.replace(/\D/g, "") === payerDoc.number.replace(/\D/g, "")
      : null;

  return (
    <main className="mx-auto max-w-3xl rounded-xl2 border border-line bg-paper p-6 sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="font-display text-2xl font-semibold">Heca - Store</p>
          <p className="mt-1 text-sm text-ink-muted">{variant === "staff" ? "Comprovante de pagamento · uso interno" : "Comprovante de pagamento"}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
            {payment.status === "approved" ? "Pagamento aprovado" : `Status: ${payment.status ?? "—"}`}
          </div>
          {payment.live_mode === false && (
            <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
              Ambiente de teste — não é dinheiro real
            </div>
          )}
        </div>
      </div>

      <section className="grid gap-5 border-b border-line py-6 text-sm sm:grid-cols-2">
        <div>
          <p className="text-ink-muted">Pedido</p>
          <p className="mt-1 font-mono font-medium">#{orderId.slice(-8)}</p>
        </div>
        <div>
          <p className="text-ink-muted">ID do pagamento Mercado Pago</p>
          <p className="mt-1 break-all font-mono font-medium">{payment.id}</p>
        </div>
        <div>
          <p className="text-ink-muted">Cliente</p>
          <p className="mt-1 font-medium">{customerName}</p>
          <p className="text-ink-soft">{customerEmail}</p>
        </div>
        <div>
          <p className="text-ink-muted">Data da aprovação</p>
          <p className="mt-1 font-medium">{formatDate(payment.date_approved)}</p>
          <p className="text-xs text-ink-soft">Criado em {formatDate(payment.date_created)}</p>
        </div>
        <div>
          <p className="text-ink-muted">Forma de pagamento</p>
          <p className="mt-1 font-medium">
            {paymentTypeLabel}
            {payment.payment_method_id ? ` · ${payment.payment_method_id.toUpperCase()}` : ""}
          </p>
          {cardNumberMasked && <p className="mt-0.5 font-mono text-xs text-ink-soft">{cardNumberMasked}{card?.cardholder?.name ? ` · ${card.cardholder.name}` : ""}</p>}
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
        {pixTransactionId && (
          <div>
            <p className="text-ink-muted">ID da transação PIX</p>
            <p className="mt-1 break-all font-mono font-medium">{pixTransactionId}</p>
          </div>
        )}
        {payerDocNumber && (
          <div>
            <p className="text-ink-muted">Documento usado no pagamento</p>
            <p className="mt-1 font-mono font-medium">{payerDoc?.type} {payerDocNumber}</p>
            {docMatchesAccount === false && (
              <p className="mt-0.5 text-xs font-medium text-amber-700">⚠ Diferente do CPF cadastrado na conta</p>
            )}
            {docMatchesAccount === true && (
              <p className="mt-0.5 text-xs font-medium text-green-700">✓ Confere com o CPF cadastrado na conta</p>
            )}
          </div>
        )}
        {variant === "staff" && (payment.transaction_details?.net_received_amount != null) && (
          <div>
            <p className="text-ink-muted">Valor líquido recebido</p>
            <p className="mt-1 font-medium">{formatBRL(Math.round(payment.transaction_details!.net_received_amount! * 100))}</p>
          </div>
        )}
        {variant === "staff" && payment.money_release_date && (
          <div>
            <p className="text-ink-muted">Liberação do dinheiro</p>
            <p className="mt-1 font-medium">{formatDate(payment.money_release_date)}{payment.money_release_status ? ` · ${payment.money_release_status}` : ""}</p>
          </div>
        )}
      </section>

      <section className="py-6">
        <p className="mb-3 text-sm font-medium">Itens da compra</p>
        <ul className="divide-y divide-line text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-3">
              <span>{item.productName}{item.variantName ? ` (${item.variantName})` : ""} × {item.qty}</span>
              <span className="whitespace-nowrap font-medium">{formatBRL(item.unitCents * item.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t-2 border-ink pt-4 text-lg font-semibold">
          <span>Total confirmado</span>
          <span>{formatBRL(paidCents || totalCents)}</span>
        </div>
      </section>

      <div className="border-t border-line pt-5 text-xs leading-relaxed text-ink-muted">
        {variant === "customer" ? (
          <>
            <p>Dados financeiros consultados diretamente na API do Mercado Pago no momento da visualização. O ID acima permite identificar a transação.</p>
            <p className="mt-2">Este documento é um comprovante comercial de pagamento e não substitui nota fiscal. O comprovante bancário original também pode ser consultado pelo comprador no aplicativo ou instituição utilizada para pagar.</p>
          </>
        ) : (
          <p>Dados ao vivo da Mercado Pago, pra conferência interna (identidade do pagador, autenticidade da transação e status do repasse). Não é o comprovante que deve ser enviado ao cliente — use a versão dele em "Minha conta".</p>
        )}
        <p className="mt-3">Emitido em {formatDate(new Date())}</p>
      </div>
    </main>
  );
}
