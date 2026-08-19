import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminOrder } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth-helpers";
import { can } from "@/lib/permissions";
import { formatBRL } from "@/lib/format";
import { resolveTrackingUrl } from "@/lib/orders";
import { updateOrderStatusAction } from "@/lib/actions/orders";
import { MP_PAYMENT_METHOD_LABELS } from "@/lib/mercadopago";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { StatusUpdateForm } from "../StatusUpdateForm";
import { OrderMessageThread } from "@/components/OrderMessageThread";

export const metadata: Metadata = { title: "Pedido · Painel" };

type Params = Promise<{ id: string }>;

export default async function PainelPedidoPage({ params }: { params: Params }) {
  const { id } = await params;
  const [order, user] = await Promise.all([getAdminOrder(id), getCurrentUser()]);
  if (!order) notFound();

  const canUpdateStatus = can(user?.role, "order:update:status");
  const action = updateOrderStatusAction.bind(null, order.id);
  const trackingUrl = resolveTrackingUrl(order.trackingCode, order.trackingUrl);

  const timeline = [...order.statusEvents, ...order.messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const highlights = [
    {
      label: "Cliente respondeu",
      value: order.messages.some((message) => message.senderRole === "CLIENTE") ? "Sim" : "Não",
      tone: order.messages.some((message) => message.senderRole === "CLIENTE") ? "amber" : "neutral",
    },
    {
      label: "Reembolso solicitado",
      value: order.status === "REEMBOLSO_SOLICITADO" ? "Aguardando análise" : order.refundReason ? "Registrado" : "Não",
      tone: order.status === "REEMBOLSO_SOLICITADO" ? "violet" : "neutral",
    },
    {
      label: "Envio",
      value: order.status === "ENVIADO" ? "Em rota" : order.status === "PREPARANDO_ENVIO" ? "Em preparo" : "Não iniciado",
      tone: order.status === "ENVIADO" ? "blue" : "neutral",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-900 via-brand-dark to-brand p-6 text-white shadow-pop sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative"><Link href="/painel/pedidos" className="text-sm font-medium text-white/70 hover:text-white">← Voltar para pedidos</Link><div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Central do pedido</p><div className="mt-2 flex flex-wrap items-center gap-3"><h2 className="font-display text-3xl font-semibold">Pedido #{order.id.slice(-8)}</h2><OrderStatusBadge status={order.status} /></div><p className="mt-2 text-sm text-white/65">Criado em {new Date(order.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · atualizado em {new Date(order.updatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p></div><div className="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur"><p className="text-xs uppercase tracking-wide text-white/60">Valor total</p><p className="font-display text-2xl font-bold">{formatBRL(order.totalCents)}</p></div></div></div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {highlights.map((item) => (
          <div
            key={item.label}
            className="group rounded-xl2 border border-line bg-paper p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand/40"
          >
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">{item.label}</p>
            <p
              className={`mt-2 text-sm font-semibold ${
                item.tone === "amber"
                  ? "text-amber-700"
                  : item.tone === "violet"
                    ? "text-violet-700"
                    : item.tone === "blue"
                      ? "text-blue-700"
                      : "text-ink"
              }`}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <div className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between"><div><p className="font-display text-lg font-semibold">Itens comprados</p><p className="text-xs text-ink-muted">Resumo financeiro da compra</p></div><span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand">{order.items.length} item(ns)</span></div>
            <ul className="divide-y divide-line text-sm">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mist text-xs font-bold text-brand">{it.qty}×</span><span className="truncate">
                    {it.productName}
                    {it.variantName ? ` · ${it.variantName}` : ""}
                  </span></span>
                  <span className="font-medium">{formatBRL(it.unitCents * it.qty)}</span>
                </li>
              ))}
            </ul>
            {order.shippingCents != null ? (
              <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3 text-sm">
                <div className="flex justify-between text-ink-soft">
                  <span>Subtotal</span>
                  <span>{formatBRL(order.totalCents - order.shippingCents)}</span>
                </div>
                <div className="flex justify-between text-ink-soft">
                  <span>Frete{order.shippingMethod ? ` (${order.shippingMethod})` : ""}</span>
                  <span>{order.shippingCents === 0 ? "Grátis" : formatBRL(order.shippingCents)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatBRL(order.totalCents)}</span>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm font-semibold">
                <span>Total</span>
                <span>{formatBRL(order.totalCents)}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
            <div className="mb-4"><p className="font-display text-lg font-semibold">Histórico operacional</p><p className="text-xs text-ink-muted">Status e mensagens em ordem cronológica</p></div>
            <ul className="flex flex-col gap-4 text-sm">
              {timeline.map((event) => {
                const isMessage = "senderRole" in event;
                return (
                  <li key={event.id} className="relative flex items-start gap-3 rounded-xl border border-line bg-mist/60 p-3 transition hover:border-brand/30 hover:bg-brand-soft/20">
                    {isMessage ? (
                      <span className={`mt-0.5 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        event.senderRole === "CLIENTE"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-brand-soft text-brand"
                      }`}>
                        {event.senderRole === "CLIENTE" ? "Cliente" : "Equipe"}
                      </span>
                    ) : (
                      <OrderStatusBadge status={event.status} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-ink-soft">{new Date(event.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
                      {isMessage ? (
                        <p className="mt-1 whitespace-pre-wrap text-ink-soft">{event.text}</p>
                      ) : (
                        <p className="mt-1 text-ink-muted">{event.note || "Atualização de status"}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-28 xl:self-start">
          <div className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Cliente</p>
            <p className="text-sm text-ink-soft">{order.email}</p>
          </div>

          {order.shipStreet && (
            <div className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Endereço de entrega</p>
              <p className="text-sm text-ink-soft">{order.shipName}</p>
              <p className="text-sm text-ink-muted">
                {order.shipStreet}, {order.shipNumber}
                {order.shipComplement ? ` — ${order.shipComplement}` : ""}
              </p>
              <p className="text-sm text-ink-muted">
                {order.shipNeighborhood}, {order.shipCity}/{order.shipState}
              </p>
              <p className="text-sm text-ink-muted">CEP {order.shipCep}</p>
            </div>
          )}

          {order.trackingCode && (
            <div className="rounded-xl2 border border-blue-200 bg-blue-50 p-5 shadow-card">
              <p className="mb-2 text-sm font-medium">Rastreamento</p>
              <p className="font-mono text-sm text-ink-soft">{order.trackingCode}</p>
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm text-brand hover:underline"
                >
                  Ver rastreamento →
                </a>
              )}
            </div>
          )}

          <div className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Pagamento</p>
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Meio</dt>
                <dd>
                  {order.mpPaymentMethod
                    ? MP_PAYMENT_METHOD_LABELS[order.mpPaymentMethod] ?? order.mpPaymentMethod
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Detalhe MP</dt>
                <dd className="text-right">{order.mpStatusDetail ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">ID pagamento</dt>
                <dd className="font-mono text-xs">{order.mpPaymentId ?? "—"}</dd>
              </div>
            </dl>
          </div>

          {canUpdateStatus && (
            <div className="rounded-xl2 border border-brand/30 bg-brand-soft/30 p-5 shadow-card">
              <p className="mb-1 font-display text-lg font-semibold">Próxima ação</p><p className="mb-3 text-xs text-ink-muted">Atualize o cliente sobre o andamento</p>
              <StatusUpdateForm action={action} currentStatus={order.status} />
            </div>
          )}
        </aside>
      </div>

      <div id="chat" className="scroll-mt-28">
        <OrderMessageThread
          orderId={order.id}
          mode="staff"
          messages={order.messages}
          closed={order.chatClosedAt != null}
        />
      </div>
    </div>
  );
}
