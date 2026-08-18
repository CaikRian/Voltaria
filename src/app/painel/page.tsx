import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth-helpers";
import { can } from "@/lib/permissions";
import { getSellerDashboardSummary } from "@/lib/admin";

export const metadata: Metadata = { title: "Painel" };

export default async function PainelPage() {
  const user = await requireStaff();
  const summary = await getSellerDashboardSummary();

  const cards = [
    {
      title: "Novo produto",
      desc: "Cadastrar item no catálogo",
      need: "product:create" as const,
      href: "/painel/produtos/novo",
    },
    {
      title: "Repor estoque",
      desc: "Atualizar quantidades",
      need: "product:update" as const,
      href: "/painel/produtos",
    },
    {
      title: "Alterar preços",
      desc: "Preços e descontos",
      need: "product:price" as const,
      href: "/painel/produtos",
    },
    {
      title: "Pedidos",
      desc: "Atualizar status de envio",
      need: "order:update:status" as const,
      href: "/painel/pedidos",
    },
    { title: "Dúvidas", desc: "Responder clientes", need: "question:answer" as const, href: "/painel/duvidas" },
    {
      title: "Avaliações",
      desc: "Moderar avaliações de produtos",
      need: "content:moderate" as const,
      href: "/painel/avaliacoes",
    },
    {
      title: "Usuários",
      desc: "Gerenciar equipe",
      need: "user:manage" as const,
      href: "/painel/usuarios",
    },
  ].filter((c) => can(user.role, c.need));

  const alerts = [
    { label: "Pagamentos pendentes", value: summary.awaitingApproval, tone: "amber" },
    { label: "Reembolsos", value: summary.refundRequests, tone: "violet" },
    { label: "Envios em andamento", value: summary.pendingShipment, tone: "blue" },
    { label: "Chats com cliente", value: summary.chatPending, tone: "brand" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {alerts.map((alert) => (
          <div
            key={alert.label}
            className="rounded-xl2 border border-line bg-paper p-4 shadow-card"
          >
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              {alert.label}
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="font-display text-3xl font-semibold">{alert.value}</span>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  alert.tone === "amber"
                    ? "bg-amber-100 text-amber-800"
                    : alert.tone === "violet"
                      ? "bg-violet-100 text-violet-800"
                      : alert.tone === "blue"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-brand-soft text-brand"
                }`}
              >
                {alert.value === 0 ? "OK" : "ATENÇÃO"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const body = (
            <>
              <p className="font-display font-semibold">{c.title}</p>
              <p className="mt-1 text-sm text-ink-muted">{c.desc}</p>
            </>
          );
          return c.href ? (
            <Link
              key={c.title}
              href={c.href}
              className="rounded-xl2 border border-line bg-paper p-5 shadow-card transition-colors hover:border-brand hover:bg-brand-soft/40"
            >
              {body}
            </Link>
          ) : (
            <div key={c.title} className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
              {body}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl font-semibold">Mensagens pendentes</p>
            <p className="text-sm text-ink-muted">Cliente esperando resposta ou acompanhamento</p>
          </div>
          <Link href="/painel/pedidos" className="text-sm font-medium text-brand hover:underline">
            Ver todos os pedidos
          </Link>
        </div>

        {summary.pendingMessages.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma mensagem pendente neste momento.</p>
        ) : (
          <div className="space-y-3">
            {summary.pendingMessages.map((order) => (
              <Link
                key={order.id}
                href={`/painel/pedidos/${order.id}`}
                className="flex flex-col gap-2 rounded-xl border border-line bg-mist p-3 transition-colors hover:border-brand hover:bg-brand-soft/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm text-ink">#{order.id.slice(-8)}</span>
                  <span className="text-xs text-ink-muted">
                    {new Date(order.updatedAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{order.email}</span>
                  <span className="text-xs rounded-full bg-brand-soft px-2 py-1 text-brand">
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-ink-soft">
                  {order.messages[0]?.text ?? "Cliente deixou mensagem no chat do pedido."}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <p className="text-sm text-ink-muted">
        Note que os cards acima já aparecem conforme o papel do usuário logado.
      </p>
    </div>
  );
}
