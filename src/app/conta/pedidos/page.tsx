import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { getOrdersByUser, resolveTrackingUrl } from "@/lib/orders";
import { formatBRL } from "@/lib/format";
import { MP_PAYMENT_METHOD_LABELS } from "@/lib/mercadopago";
import { STATUS_META, type OrderStatus } from "@/lib/order-status";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export const metadata: Metadata = { title: "Meus pedidos · Minha conta" };

const FLOW: OrderStatus[] = ["AGUARDANDO_PAGAMENTO", "PAGAMENTO_APROVADO", "PREPARANDO_ENVIO", "ENVIADO", "ENTREGUE"];

const STATUS_HINT: Record<OrderStatus, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando a confirmação do Mercado Pago.",
  PAGAMENTO_RECUSADO: "O pagamento não foi aprovado. Você pode tentar novamente.",
  PAGAMENTO_APROVADO: "Pagamento confirmado. A preparação começa em seguida.",
  PREPARANDO_ENVIO: "Seus produtos estão sendo separados e embalados.",
  ENVIADO: "O pacote está com a transportadora e segue para entrega.",
  ENTREGUE: "Entrega concluída. Esperamos que você aproveite a compra!",
  REEMBOLSO_SOLICITADO: "Sua solicitação de reembolso está em análise.",
  REEMBOLSADO: "O reembolso foi processado.",
  CANCELADO: "Este pedido foi cancelado.",
};

const STATUS_ACCENT: Record<OrderStatus, string> = {
  AGUARDANDO_PAGAMENTO: "border-l-amber-400", PAGAMENTO_RECUSADO: "border-l-red-400",
  PAGAMENTO_APROVADO: "border-l-emerald-500", PREPARANDO_ENVIO: "border-l-blue-500",
  ENVIADO: "border-l-indigo-500", ENTREGUE: "border-l-emerald-500",
  REEMBOLSO_SOLICITADO: "border-l-purple-500", REEMBOLSADO: "border-l-purple-500",
  CANCELADO: "border-l-gray-400",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function progressFor(status: string) {
  const index = FLOW.indexOf(status as OrderStatus);
  if (index >= 0) return index + 1;
  if (status === "REEMBOLSO_SOLICITADO" || status === "REEMBOLSADO") return FLOW.length;
  return 0;
}

export default async function ContaPedidosPage() {
  const user = await requireUser();
  const orders = await getOrdersByUser(user.id);
  const activeCount = orders.filter((order) => ["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO", "ENVIADO"].includes(order.status)).length;
  const deliveredCount = orders.filter((order) => order.status === "ENTREGUE").length;

  return (
    <div className="container-x py-8 sm:py-10">
      <Link href="/conta" className="text-sm font-medium text-brand hover:underline">← Voltar para minha conta</Link>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Meus pedidos</h1>
          <p className="mt-1 text-sm text-ink-muted">Acompanhe pagamentos, preparação e entrega em um só lugar.</p>
        </div>
        {orders.length > 0 && <Link href="/produtos" className="mt-2 inline-flex h-10 items-center justify-center rounded-xl border border-line bg-paper px-4 text-sm font-medium transition-colors hover:border-brand hover:bg-brand-soft sm:mt-0">Continuar comprando</Link>}
      </div>

      {orders.length === 0 ? (
        <div className="mt-8 grid place-items-center rounded-xl2 border border-dashed border-line bg-paper px-6 py-16 text-center shadow-card">
          <div className="max-w-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-3xl">🛍️</div>
            <p className="mt-5 font-display text-lg font-semibold">Sua lista de pedidos está vazia</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">Quando você finalizar uma compra, poderá acompanhar cada etapa por aqui.</p>
            <Link href="/produtos" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand-dark">Explorar produtos</Link>
          </div>
        </div>
      ) : (
        <>
          <section className="mt-7 grid grid-cols-3 gap-3" aria-label="Resumo dos pedidos">
            <SummaryCard value={orders.length} label="Pedidos" />
            <SummaryCard value={activeCount} label="Em andamento" highlight />
            <SummaryCard value={deliveredCount} label="Entregues" />
          </section>

          <ul className="mt-6 space-y-5">
            {orders.map((order) => {
              const status = order.status as OrderStatus;
              const meta = STATUS_META[status];
              const progress = progressFor(status);
              const trackingUrl = resolveTrackingUrl(order.trackingCode, order.trackingUrl);
              const paymentLabel = order.mpPaymentMethod ? MP_PAYMENT_METHOD_LABELS[order.mpPaymentMethod] ?? order.mpPaymentMethod : "Não informado";
              const visibleItems = order.items.slice(0, 2);
              const remainingItems = order.items.length - visibleItems.length;
              const canViewReceipt = !!order.mpPaymentId && !["AGUARDANDO_PAGAMENTO", "PAGAMENTO_RECUSADO"].includes(order.status);

              return (
                <li key={order.id} className={`overflow-hidden rounded-xl2 border border-l-4 border-line bg-paper shadow-card transition-shadow hover:shadow-lg ${STATUS_ACCENT[status] ?? "border-l-gray-400"}`}>
                  <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <p className="font-display text-lg font-semibold">Pedido #{order.id.slice(-8)}</p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">Realizado em {formatDate(order.createdAt)} · Atualizado em {formatDate(order.updatedAt)}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs uppercase tracking-wide text-ink-muted">Total do pedido</p>
                      <p className="mt-0.5 text-xl font-semibold">{formatBRL(order.totalCents)}</p>
                    </div>
                  </div>

                  <div className="grid gap-6 px-5 py-5 lg:grid-cols-[1fr_280px]">
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">{progress || "!"}</div>
                        <div><p className="text-sm font-semibold">{meta?.label ?? order.status}</p><p className="mt-1 text-sm leading-relaxed text-ink-soft">{STATUS_HINT[status] ?? meta?.description}</p></div>
                      </div>

                      {progress > 0 && (
                        <div className="mt-5" aria-label={`Etapa ${progress} de ${FLOW.length}`}>
                          <div className="flex gap-1.5">{FLOW.map((step, index) => <span key={step} className={`h-1.5 flex-1 rounded-full ${index < progress ? "bg-brand" : "bg-line"}`} />)}</div>
                          <div className="mt-2 flex justify-between text-[11px] text-ink-muted"><span>Pagamento</span><span>Preparação</span><span>Entrega</span></div>
                        </div>
                      )}

                      <div className="mt-5 rounded-xl bg-mist px-4 py-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Produtos ({order.items.reduce((sum, item) => sum + item.qty, 0)})</p>
                        <ul className="space-y-1.5 text-sm">{visibleItems.map((item) => <li key={item.id} className="flex justify-between gap-3"><span className="min-w-0 truncate">{item.productName}{item.variantName ? ` · ${item.variantName}` : ""}</span><span className="shrink-0 text-ink-muted">× {item.qty}</span></li>)}</ul>
                        {remainingItems > 0 && <p className="mt-2 text-xs font-medium text-brand">+ {remainingItems} outro(s) item(ns)</p>}
                      </div>
                    </div>

                    <div className="flex flex-col border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                      <dl className="space-y-3 text-sm">
                        <div><dt className="text-xs text-ink-muted">Pagamento</dt><dd className="mt-0.5 font-medium">{paymentLabel}</dd></div>
                        <div><dt className="text-xs text-ink-muted">Entrega</dt><dd className="mt-0.5 font-medium">{order.shippingMethod || "Método não informado"}</dd>{order.shipCity && <dd className="mt-0.5 text-xs text-ink-muted">{order.shipCity}/{order.shipState}</dd>}</div>
                        {order.trackingCode && <div><dt className="text-xs text-ink-muted">Código de rastreio</dt><dd className="mt-0.5 break-all font-mono text-xs font-medium">{order.trackingCode}</dd></div>}
                      </dl>

                      <div className="mt-5 flex flex-col gap-2 lg:mt-auto lg:pt-5">
                        <Link href={`/conta/pedidos/${order.id}`} className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark">Ver detalhes do pedido</Link>
                        {trackingUrl && <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center rounded-xl border border-line px-4 text-sm font-medium transition-colors hover:bg-brand-soft">Rastrear entrega</a>}
                        {canViewReceipt && <Link href={`/conta/pedidos/${order.id}/comprovante`} className="text-center text-xs font-medium text-brand hover:underline">Visualizar comprovante de pagamento</Link>}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function SummaryCard({ value, label, highlight = false }: { value: number; label: string; highlight?: boolean }) {
  return <div className={`rounded-xl border p-3 sm:p-4 ${highlight ? "border-brand/30 bg-brand-soft" : "border-line bg-paper"}`}><p className={`text-xl font-semibold sm:text-2xl ${highlight ? "text-brand-dark" : "text-ink"}`}>{value}</p><p className="mt-0.5 text-xs text-ink-muted sm:text-sm">{label}</p></div>;
}
