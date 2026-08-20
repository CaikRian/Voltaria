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
  transaction_amount_refunded?: number;
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
type ReceiptReturn = { id: string; status: string; requestType: string; approvedCents: number | null; requestedCents: number; refundedAt: Date | string | null; mpRefundId: string | null };

type ReceiptOrderDetails = {
  status: string;
  createdAt: Date | string;
  shippingCents: number | null;
  shippingMethod: string | null;
  shippingProvider: string | null;
  shipName: string | null;
  shipStreet: string | null;
  shipNumber: string | null;
  shipComplement: string | null;
  shipNeighborhood: string | null;
  shipCity: string | null;
  shipState: string | null;
  shipCep: string | null;
  refundedCents: number;
  returns: ReceiptReturn[];
};

const ORDER_LABELS: Record<string, string> = { AGUARDANDO_PAGAMENTO: "Aguardando pagamento", PAGAMENTO_RECUSADO: "Pagamento recusado", PAGAMENTO_APROVADO: "Pagamento confirmado", PREPARANDO_ENVIO: "Preparando envio", ENVIADO: "Enviado", ENTREGUE: "Entregue", REEMBOLSADO: "Reembolsado", CANCELADO: "Cancelado" };
const PAYMENT_LABELS: Record<string, string> = { approved: "Pagamento aprovado", pending: "Pagamento pendente", in_process: "Em análise", rejected: "Pagamento recusado", refunded: "Pagamento reembolsado", charged_back: "Pagamento contestado", cancelled: "Pagamento cancelado" };

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
  orderDetails,
}: {
  variant: "customer" | "staff";
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: ReceiptItem[];
  totalCents: number;
  payment: ReceiptPayment;
  accountCpf?: string | null;
  orderDetails: ReceiptOrderDetails;
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
  const itemSubtotalCents = items.reduce((sum, item) => sum + item.unitCents * item.qty, 0);
  const refundedCents = Math.max(orderDetails.refundedCents, Math.round((payment.transaction_amount_refunded ?? 0) * 100));
  const confirmedCents = paidCents || totalCents;
  const netAfterRefundCents = Math.max(0, confirmedCents - refundedCents);

  return (
    <main className="mx-auto max-w-3xl rounded-xl2 border border-line bg-paper p-6 sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="font-display text-2xl font-semibold">Heca - Store</p>
          <p className="mt-1 text-sm text-ink-muted">{variant === "staff" ? "Comprovante de pagamento · uso interno" : "Comprovante de pagamento"}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
            {PAYMENT_LABELS[payment.status || ""] ?? `Status: ${payment.status ?? "—"}`}
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

      <section className="grid gap-4 border-b border-line py-6 sm:grid-cols-3">
        <div className="rounded-xl bg-mist p-4"><p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Situação do pedido</p><p className="mt-2 text-sm font-semibold">{ORDER_LABELS[orderDetails.status] ?? orderDetails.status}</p><p className="mt-1 text-xs text-ink-muted">Pedido criado em {formatDate(orderDetails.createdAt)}</p></div>
        <div className="rounded-xl bg-mist p-4"><p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Entrega contratada</p><p className="mt-2 text-sm font-semibold">{orderDetails.shippingMethod || "Frete não informado"}</p><p className="mt-1 text-xs text-ink-muted">{orderDetails.shippingProvider === "MELHOR_ENVIO" ? "Intermediado pelo Melhor Envio" : orderDetails.shippingProvider || "Transportadora não informada"}</p></div>
        <div className={`rounded-xl p-4 ${refundedCents > 0 ? "bg-violet-50" : "bg-emerald-50"}`}><p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Resultado financeiro</p><p className="mt-2 text-sm font-semibold">{refundedCents > 0 ? `${formatBRL(refundedCents)} reembolsado` : "Sem reembolsos"}</p><p className="mt-1 text-xs text-ink-muted">Valor líquido da compra: {formatBRL(netAfterRefundCents)}</p></div>
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
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm"><div className="flex justify-between"><dt className="text-ink-muted">Subtotal dos produtos</dt><dd>{formatBRL(itemSubtotalCents)}</dd></div><div className="flex justify-between"><dt className="text-ink-muted">Frete</dt><dd>{orderDetails.shippingCents == null ? "—" : formatBRL(orderDetails.shippingCents)}</dd></div><div className="flex justify-between border-t-2 border-ink pt-3 text-lg font-semibold"><dt>Total confirmado</dt><dd>{formatBRL(confirmedCents)}</dd></div>{refundedCents > 0 && <><div className="flex justify-between text-violet-700"><dt>Reembolsos confirmados</dt><dd>− {formatBRL(refundedCents)}</dd></div><div className="flex justify-between rounded-lg bg-violet-50 px-3 py-2 font-semibold"><dt>Valor após reembolsos</dt><dd>{formatBRL(netAfterRefundCents)}</dd></div></>}</dl>
      </section>

      {orderDetails.shipStreet && <section className="border-t border-line py-6 text-sm"><p className="font-semibold">Endereço de entrega</p><p className="mt-2 text-ink-soft">{orderDetails.shipName}<br />{orderDetails.shipStreet}, {orderDetails.shipNumber}{orderDetails.shipComplement ? ` — ${orderDetails.shipComplement}` : ""}<br />{orderDetails.shipNeighborhood} · {orderDetails.shipCity}/{orderDetails.shipState}<br />CEP {orderDetails.shipCep}</p></section>}

      {orderDetails.returns.length > 0 && <section className="border-t border-line py-6"><p className="mb-3 text-sm font-semibold">Cancelamentos e devoluções</p><ul className="space-y-2 text-sm">{orderDetails.returns.map((request) => <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-mist p-3"><span>{request.requestType === "CANCELLATION" ? "Cancelamento" : "Devolução"} · {request.status}</span><span className="font-semibold">{formatBRL(request.approvedCents ?? request.requestedCents)}</span>{request.mpRefundId && <span className="w-full break-all font-mono text-[10px] text-ink-muted">ID do reembolso: {request.mpRefundId}</span>}</li>)}</ul></section>}

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
