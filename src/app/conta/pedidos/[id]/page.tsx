import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { getOrderForUser, resolveTrackingUrl } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { MP_PAYMENT_METHOD_LABELS } from "@/lib/mercadopago";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { STATUS_META } from "@/lib/order-status";
import { OrderClientActions } from "../OrderClientActions";
import { CustomerReturnFlow } from "@/components/ReturnFlow";
import { OrderAddressEditor } from "../OrderAddressEditor";
import { OrderMessageThread } from "@/components/OrderMessageThread";
import { getOrderTrackingHint } from "@/lib/orders";
import { OrderTimeline } from "@/components/OrderTimeline";
import { ShippingTrackingTimeline } from "@/components/ShippingTrackingTimeline";

export const metadata: Metadata = { title: "Pedido · Minha conta" };

type Params = Promise<{ id: string }>;

export default async function ContaPedidoPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser();
  const order = await getOrderForUser(id, user.id);
  if (!order) notFound();

  const statusMeta = STATUS_META[order.status as keyof typeof STATUS_META];
  const trackingNote = getOrderTrackingHint(order.statusEvents);
  const trackingUrl = resolveTrackingUrl(order.trackingCode, order.trackingUrl);
  const productIds = [...new Set(order.items.map((item) => item.productId))];
  const productSlugs = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, slug: true },
  });
  const slugByProductId = Object.fromEntries(productSlugs.map((product) => [product.id, product.slug]));
  const reviewLinks = order.items.map((item) => ({
    id: item.productId,
    label: item.productName,
    href: slugByProductId[item.productId] ? `/produtos/${slugByProductId[item.productId]}` : "/produtos",
  }));

  return (
    <div className="container-x py-8 sm:py-10">
      <Link href="/conta/pedidos" className="text-sm font-medium text-brand hover:underline">
        ← Voltar para meus pedidos
      </Link>

      <div className="mb-6 mt-4 overflow-hidden rounded-xl2 border border-line bg-paper shadow-card">
        <div className="flex flex-col gap-5 bg-gradient-to-br from-brand-soft via-paper to-paper px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-semibold">Pedido #{order.id.slice(-8)}</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            {statusMeta && <p className="mt-2 max-w-2xl text-sm text-ink-soft">{statusMeta.description}</p>}
            <p className="mt-3 text-xs text-ink-muted">
              Realizado em {new Date(order.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · Atualizado em {new Date(order.updatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </p>
          </div>
          <div className="rounded-xl bg-paper/90 px-5 py-3 shadow-sm ring-1 ring-line sm:text-right">
            <p className="text-xs uppercase tracking-wide text-ink-muted">Total da compra</p>
            <p className="mt-0.5 text-2xl font-semibold">{formatBRL(order.totalCents)}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{order.items.reduce((sum, item) => sum + item.qty, 0)} produto(s)</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-5">
          <div className="rounded-xl2 border border-line bg-paper p-5 shadow-card sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div><p className="font-semibold">Produtos da compra</p><p className="mt-0.5 text-xs text-ink-muted">Valores registrados no momento do pedido</p></div>
              <span className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-ink-soft">{order.items.length} {order.items.length === 1 ? "item" : "itens"}</span>
            </div>
            <ul className="divide-y divide-line">
              {order.items.map((it, index) => (
                <li key={it.id} className="flex items-center gap-3 py-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-sm font-semibold text-brand">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.productName}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{it.variantName ? `${it.variantName} · ` : ""}Quantidade: {it.qty}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{formatBRL(it.unitCents * it.qty)}</span>
                </li>
              ))}
            </ul>
            {order.shippingCents != null ? (
              <div className="mt-3 flex flex-col gap-2 rounded-xl bg-mist p-4 text-sm">
                <div className="flex justify-between text-ink-soft">
                  <span>Subtotal</span>
                  <span>{formatBRL(order.totalCents - order.shippingCents)}</span>
                </div>
                <div className="flex justify-between text-ink-soft">
                  <span>Frete{order.shippingMethod ? ` (${order.shippingMethod})` : ""}</span>
                  <span>{order.shippingCents === 0 ? "Grátis" : formatBRL(order.shippingCents)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-line pt-3 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatBRL(order.totalCents)}</span>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex justify-between rounded-xl bg-mist p-4 text-sm font-semibold">
                <span>Total</span>
                <span>{formatBRL(order.totalCents)}</span>
              </div>
            )}
          </div>

          <OrderTimeline
            status={order.status}
            events={order.statusEvents}
            createdAt={order.createdAt}
          />
          <ShippingTrackingTimeline events={order.shippingEvents} trackingCode={order.trackingCode} trackingUrl={trackingUrl} needsAttention={order.shippingNeedsAttention} />
        </div>

        <aside className="flex flex-col gap-5">
          {order.shipStreet && (
            <div className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand">⌂</span>
                <div><p className="text-sm font-semibold">Endereço de entrega</p><p className="text-xs text-ink-muted">Destino deste pedido</p></div>
              </div>
              <OrderAddressEditor
                orderId={order.id}
                status={order.status}
                initialAddress={{
                  name: order.shipName || "",
                  street: order.shipStreet || "",
                  number: order.shipNumber || "",
                  complement: order.shipComplement || undefined,
                  neighborhood: order.shipNeighborhood || "",
                  city: order.shipCity || "",
                  state: order.shipState || "",
                  cep: order.shipCep || "",
                }}
              />
            </div>
          )}

          <div className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 font-bold text-emerald-700">$</span>
              <div><p className="text-sm font-semibold">Pagamento</p><p className="text-xs text-ink-muted">Processado pelo Mercado Pago</p></div>
            </div>
            <dl className="flex flex-col gap-2.5 rounded-xl bg-mist p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Meio</dt>
                <dd>
                  {order.mpPaymentMethod
                    ? MP_PAYMENT_METHOD_LABELS[order.mpPaymentMethod] ?? order.mpPaymentMethod
                    : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5">
                <dt className="text-ink-muted">ID pagamento</dt>
                <dd className="break-all text-right font-mono text-xs">{order.mpPaymentId ?? "—"}</dd>
              </div>
            </dl>
            {order.mpPaymentId && order.status !== "AGUARDANDO_PAGAMENTO" && order.status !== "PAGAMENTO_RECUSADO" ? (
              <Link
                href={`/conta/pedidos/${order.id}/comprovante`}
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-brand/30 bg-brand-soft px-4 text-sm font-medium text-brand-dark transition-colors hover:bg-brand/10"
              >
                Ver comprovante de pagamento
              </Link>
            ) : null}
          </div>

          <div className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
            <p className="mb-1 text-sm font-semibold">O que você deseja fazer?</p>
            <p className="mb-4 text-xs text-ink-muted">Ações disponíveis para a etapa atual.</p>
            <OrderClientActions
              orderId={order.id}
              status={order.status}
              reviewLinks={reviewLinks}
              trackingNote={trackingNote}
              trackingUrl={trackingUrl}
            />
          </div>

          {order.status === "ENVIADO" || order.status === "ENTREGUE" ? (
            <div className="rounded-xl2 border border-brand/20 bg-brand-soft p-5 shadow-card">
              <p className="mb-1 text-sm font-semibold text-brand-dark">Seu pedido está a caminho</p>
              <p className="mb-3 text-xs text-ink-muted">Acompanhe as movimentações da transportadora.</p>
              {order.trackingCode && (
                <p className="font-mono text-sm text-ink-soft">{order.trackingCode}</p>
              )}
              {trackingUrl ? (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
                >
                  Rastrear pacote →
                </a>
              ) : (
                <p className="text-sm text-ink-soft">
                  {trackingNote || "Acompanhe seu pedido pela transportadora ou com o vendedor."}
                </p>
              )}
            </div>
          ) : null}
        </aside>
      </div>

      <div className="mt-6">
        <CustomerReturnFlow orderId={order.id} orderStatus={order.status} items={order.items} requests={order.returnRequests} />
      </div>

      <details className="group mt-6 overflow-hidden rounded-xl2 border border-line bg-paper shadow-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 transition-colors hover:bg-mist [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-sm font-semibold">Precisa de ajuda com este pedido?</p>
            <p className="mt-1 text-xs text-ink-muted">
              Abra o chat somente se quiser falar diretamente com nossa equipe
              {order.messages.length > 0 ? ` · ${order.messages.length} mensagem(ns)` : ""}.
            </p>
          </div>
          <span className="shrink-0 rounded-xl border border-line px-4 py-2 text-sm font-medium text-brand transition-colors group-open:bg-brand group-open:text-white">
            <span className="group-open:hidden">Falar sobre o pedido</span>
            <span className="hidden group-open:inline">Fechar chat</span>
          </span>
        </summary>
        <div className="border-t border-line p-4 sm:p-5">
          <OrderMessageThread
            orderId={order.id}
            mode="customer"
            messages={order.messages}
            closed={order.chatClosedAt != null || order.status === "CANCELADO"}
          />
        </div>
      </details>
    </div>
  );
}
