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
import { OrderAddressEditor } from "../OrderAddressEditor";
import { OrderMessageThread } from "@/components/OrderMessageThread";
import { getOrderTrackingHint } from "@/lib/orders";

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
    <div className="container-x py-10">
      <div className="mb-6">
        <Link href="/conta/pedidos" className="text-sm text-brand hover:underline">
          ← Voltar para meus pedidos
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-xl font-semibold">Pedido #{order.id.slice(-8)}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Criado em {new Date(order.createdAt).toLocaleString("pt-BR")} · última atualização em{" "}
          {new Date(order.updatedAt).toLocaleString("pt-BR")}
        </p>
        {statusMeta && (
          <p className="mt-2 text-sm text-ink-soft">{statusMeta.description}</p>
        )}
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
            <p className="mb-3 text-sm font-medium">Linha do tempo</p>
            <ul className="flex flex-col gap-3 text-sm">
              {order.statusEvents.map((ev) => (
                <li key={ev.id} className="flex items-start gap-3">
                  <OrderStatusBadge status={ev.status} />
                  <div>
                    <p className="text-ink-soft">{new Date(ev.createdAt).toLocaleString("pt-BR")}</p>
                    {ev.note && <p className="text-ink-muted">{ev.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          {order.shipStreet && (
            <div className="rounded-xl2 border border-line bg-paper p-4">
              <p className="mb-3 text-sm font-medium">Endereço de entrega</p>
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
                <dt className="text-ink-muted">ID pagamento</dt>
                <dd className="font-mono text-xs">{order.mpPaymentId ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl2 border border-line bg-paper p-4">
            <p className="mb-3 text-sm font-medium">Ações</p>
            <OrderClientActions
              orderId={order.id}
              status={order.status}
              reviewLinks={reviewLinks}
              trackingNote={trackingNote}
              trackingUrl={trackingUrl}
            />
          </div>

          {order.status === "ENVIADO" || order.status === "ENTREGUE" ? (
            <div className="rounded-xl2 border border-line bg-paper p-4">
              <p className="mb-2 text-sm font-medium">Rastreamento</p>
              {order.trackingCode && (
                <p className="font-mono text-sm text-ink-soft">{order.trackingCode}</p>
              )}
              {trackingUrl ? (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-sm text-brand hover:underline"
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
        <OrderMessageThread
          orderId={order.id}
          mode="customer"
          messages={order.messages}
          closed={order.chatClosedAt != null}
        />
      </div>
    </div>
  );
}
