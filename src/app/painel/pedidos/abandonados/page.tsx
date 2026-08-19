/**
 * Página de Dashboard - Pedidos Abandonados (Painel Admin)
 * 
 * Accessible at: /painel/pedidos/abandonados
 * Requires: GERENTE ou ADMIN
 */

import { requireCapability } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import Link from "next/link";

export const metadata = {
  title: "Pedidos Abandonados — Painel",
};

export default async function AbandonedOrdersPage() {
  await requireCapability("order:read:all");

  const abandonedOrders = await prisma.order.findMany({
    where: {
      status: "AGUARDANDO_PAGAMENTO",
      abandonedAt: { not: null },
    },
    include: { items: { take: 1 } }, // primeiro item apenas
    orderBy: { abandonedAt: "desc" },
    take: 100,
  });

  const stats = {
    total: abandonedOrders.length,
    totalValue: abandonedOrders.reduce((sum, o) => sum + o.totalCents, 0),
    last24h: abandonedOrders.filter(
      (o) => o.abandonedAt && new Date(o.abandonedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length,
  };

  return (
    <div className="container-x py-10">
      <div className="mb-6">
        <Link href="/painel/pedidos" className="text-sm text-brand hover:underline">
          ← Voltar para pedidos
        </Link>
        <h1 className="mb-2 mt-1 font-display text-2xl font-semibold">Pedidos Abandonados</h1>
        <p className="text-sm text-ink-muted">
          Clientes que iniciaram checkout mas não completaram o pagamento há 30+ minutos
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-paper p-4">
          <p className="text-sm text-ink-muted">Total Abandonado</p>
          <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-4">
          <p className="text-sm text-ink-muted">Valor Total</p>
          <p className="mt-1 text-2xl font-semibold">{formatBRL(stats.totalValue)}</p>
        </div>
        <div className="rounded-lg border border-line bg-paper p-4">
          <p className="text-sm text-ink-muted">Últimas 24h</p>
          <p className="mt-1 text-2xl font-semibold">{stats.last24h}</p>
        </div>
      </div>

      {/* Table */}
      {abandonedOrders.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed border-line py-12 text-center">
          <p className="text-ink-muted">Nenhum pedido abandonado no momento</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-mist">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Pedido</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Valor</th>
                <th className="px-4 py-3 text-left font-medium">Abandonado</th>
                <th className="px-4 py-3 text-left font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {abandonedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-mist/50">
                  <td className="px-4 py-3">
                    <Link href={`/painel/pedidos/${order.id}`} className="font-mono text-brand hover:underline">
                      #{order.id.slice(-8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{order.email}</p>
                      <p className="text-xs text-ink-muted">{order.items[0]?.qty || 0} item(s)</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatBRL(order.totalCents)}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    {order.abandonedAt
                      ? new Date(order.abandonedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/painel/pedidos/${order.id}`}
                      className="text-xs text-brand hover:underline"
                    >
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
