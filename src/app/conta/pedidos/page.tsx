import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { getOrdersByUser } from "@/lib/orders";
import { formatBRL } from "@/lib/format";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export const metadata: Metadata = { title: "Meus pedidos · Minha conta" };

export default async function ContaPedidosPage() {
  const user = await requireUser();
  const orders = await getOrdersByUser(user.id);

  return (
    <div className="container-x py-10">
      <Link href="/conta" className="text-sm text-brand hover:underline">
        ← Voltar para minha conta
      </Link>
      <h1 className="mb-6 mt-1 font-display text-2xl font-semibold">Meus pedidos</h1>

      {orders.length === 0 ? (
        <div className="grid place-items-center rounded-xl2 border border-dashed border-line py-16 text-center">
          <div>
            <p className="font-medium">Você ainda não fez nenhum pedido</p>
            <p className="mt-1 text-sm text-ink-muted">Quando comprar algo, seus pedidos aparecem aqui.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-line bg-paper">
          <div className="hidden grid-cols-[120px_80px_120px_120px_140px] gap-3 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted sm:grid">
            <span>Pedido</span>
            <span>Itens</span>
            <span>Total</span>
            <span>Status</span>
            <span>Criado em</span>
          </div>
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/conta/pedidos/${o.id}`}
                  className="grid grid-cols-2 items-center gap-3 px-4 py-3 hover:bg-mist sm:grid-cols-[120px_80px_120px_120px_140px]"
                >
                  <span className="font-mono text-sm">#{o.id.slice(-8)}</span>
                  <span className="hidden text-sm text-ink-soft sm:block">{o._count.items}</span>
                  <span className="hidden text-sm font-medium sm:block">{formatBRL(o.totalCents)}</span>
                  <span className="hidden sm:block">
                    <OrderStatusBadge status={o.status} />
                  </span>
                  <span className="hidden text-sm text-ink-soft sm:block">
                    {new Date(o.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
