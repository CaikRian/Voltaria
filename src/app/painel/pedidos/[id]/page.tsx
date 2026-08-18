import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminOrder } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth-helpers";
import { can } from "@/lib/permissions";
import { formatBRL } from "@/lib/format";
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
    <div>
      <div className="mb-6">
        <Link href="/painel/pedidos" className="text-sm text-brand hover:underline">
          ← Voltar para pedidos
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-semibold">Pedido #{order.id.slice(-8)}</h2>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Criado em {new Date(order.createdAt).toLocaleString("pt-BR")} · última atualização em{" "}
          {new Date(order.updatedAt).toLocaleString("pt-BR")}
        </p>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {highlights.map((item) => (
          <div
            key={item.label}
            className="rounded-xl2 border border-line bg-paper p-4 shadow-card"
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

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <div className="rounded-xl2 border border-line bg-paper p-4">
            <p className="mb-3 text-sm font-medium">Itens</p>
            <ul className="divide-y divide-line text-sm">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between py-2">
                  <span>
                    {it.productName}
                    {it.variantName ? ` (${it.variantName})` : ""} × {it.qty}
                  </span>
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

          <div className="rounded-xl2 border border-line bg-paper p-4">
            <p className="mb-3 text-sm font-medium">Histórico completo do pedido</p>
            <ul className="flex flex-col gap-4 text-sm">
              {timeline.map((event) => {
                const isMessage = "senderRole" in event;
                return (
                  <li key={event.id} className="flex items-start gap-3 rounded-lg border border-line bg-mist p-3">
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
                      <p className="text-ink-soft">{new Date(event.createdAt).toLocaleString("pt-BR")}</p>
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

        <aside className="flex flex-col gap-5">
          <div className="rounded-xl2 border border-line bg-paper p-4">
            <p className="mb-2 text-sm font-medium">Contato</p>
            <p className="text-sm text-ink-soft">{order.email}</p>
          </div>

          {order.shipStreet && (
            <div className="rounded-xl2 border border-line bg-paper p-4">
              <p className="mb-2 text-sm font-medium">Endereço de entrega</p>
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

          <div className="rounded-xl2 border border-line bg-paper p-4">
            <p className="mb-2 text-sm font-medium">Pagamento</p>
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
            <div className="rounded-xl2 border border-line bg-paper p-4">
              <p className="mb-2 text-sm font-medium">Atualizar status</p>
              <StatusUpdateForm action={action} currentStatus={order.status} />
            </div>
          )}
        </aside>
      </div>

      <div className="mt-6">
        <OrderMessageThread orderId={order.id} mode="staff" messages={order.messages} />
      </div>
    </div>
  );
}
