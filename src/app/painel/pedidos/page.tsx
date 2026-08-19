import Link from "next/link";
import type { Metadata } from "next";
import { getAdminOrders } from "@/lib/admin";
import { formatBRL } from "@/lib/format";
import { ORDER_STATUS, STATUS_META } from "@/lib/order-status";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export const metadata: Metadata = { title: "Pedidos · Painel" };

type SearchParams = Promise<{ q?: string; status?: string }>;

export default async function PainelPedidosPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, status } = await searchParams;
  const orders = await getAdminOrders({ q, status });

  const tabs = [
    { label: "Todos", value: undefined as string | undefined },
    ...Object.values(ORDER_STATUS).map((s) => ({
      label: STATUS_META[s].label,
      value: s as string | undefined,
    })),
  ];

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative w-full max-w-xs">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por e-mail ou nº do pedido..."
            className="h-10 w-full rounded-xl border border-line bg-mist px-4 text-sm focus:border-brand focus:bg-paper"
          />
        </form>

        <div className="flex flex-wrap gap-2 text-sm">
          {tabs.map((tab) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (tab.value) params.set("status", tab.value);
            const active = (status ?? undefined) === tab.value;
            return (
              <Link
                key={tab.label}
                href={`/painel/pedidos?${params.toString()}`}
                className={`rounded-lg border px-3 py-1.5 ${
                  active ? "border-brand bg-brand-soft text-brand" : "border-line hover:bg-mist"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="grid place-items-center rounded-xl2 border border-dashed border-line py-16 text-center">
          <div>
            <p className="font-medium">Nenhum pedido encontrado</p>
            <p className="mt-1 text-sm text-ink-muted">Ajuste a busca ou o filtro de status.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-line bg-paper">
          <div className="hidden grid-cols-[110px_1fr_90px_110px_120px_140px] gap-3 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted sm:grid">
            <span>Pedido</span>
            <span>E-mail</span>
            <span>Itens</span>
            <span>Total</span>
            <span>Status</span>
            <span>Criado em</span>
          </div>
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/painel/pedidos/${o.id}`}
                  className="grid grid-cols-2 items-center gap-3 px-4 py-3 hover:bg-mist sm:grid-cols-[110px_1fr_90px_110px_120px_140px]"
                >
                  <span className="font-mono text-sm">#{o.id.slice(-8)}</span>
                  <span className="truncate text-sm">{o.email}</span>
                  <span className="hidden text-sm text-ink-soft sm:block">{o._count.items}</span>
                  <span className="hidden text-sm font-medium sm:block">{formatBRL(o.totalCents)}</span>
                  <span className="hidden sm:block">
                    <OrderStatusBadge status={o.status} />
                  </span>
                  <span className="hidden text-sm text-ink-soft sm:block">
                    {new Date(o.createdAt).toLocaleDateString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
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
