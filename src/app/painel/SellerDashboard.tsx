import Link from "next/link";
import { can } from "@/lib/permissions";
import { formatBRL } from "@/lib/format";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import type { getSellerDashboardSummary } from "@/lib/admin";

type Summary = Awaited<ReturnType<typeof getSellerDashboardSummary>>;

export function SellerDashboard({ name, role, summary }: { name?: string | null; role: string; summary: Summary }) {
  const firstName = name?.split(" ")[0] ?? "vendedor";
  const priorities = [
    ...(can(role, "question:answer") ? [{ label: "Dúvidas sem resposta", value: summary.unansweredQuestions, href: "/painel/duvidas", description: "Clientes aguardando uma orientação" }] : []),
    { label: "Conversas aguardando", value: summary.chatPending, href: "/painel/conversas?filtro=waiting", description: "Mensagens que precisam da equipe" },
    { label: "Preparar para envio", value: summary.pendingShipment, href: "/painel/pedidos?status=PAGAMENTO_APROVADO", description: "Pedidos pagos para separar ou despachar" },
    { label: "Alertas de transporte", value: summary.shippingIssues, href: "/painel/pedidos", description: "Entregas pausadas, suspensas ou sem sucesso" },
    { label: "Reembolsos solicitados", value: summary.refundRequests, href: "/painel/pedidos?status=REEMBOLSO_SOLICITADO", description: "Solicitações que precisam de análise" },
  ];
  const actions = [
    { title: "Novo produto", desc: "Adicionar item ao catálogo", href: "/painel/produtos/novo", need: "product:create" as const, icon: "+" },
    { title: "Gerenciar estoque", desc: `${summary.lowStockCount} item(ns) com estoque baixo`, href: "/painel/produtos", need: "product:update" as const, icon: "▦" },
    { title: "Atualizar pedidos", desc: "Status, envio e rastreamento", href: "/painel/pedidos", need: "order:update:status" as const, icon: "→" },
    { title: "Conectar Melhor Envio", desc: "Autorizar fretes e rastreamento", href: "/api/integracoes/melhor-envio/autorizar", need: "order:update:status" as const, icon: "↗" },
    { title: "Responder dúvidas", desc: `${summary.unansweredQuestions} aguardando resposta`, href: "/painel/duvidas", need: "question:answer" as const, icon: "?" },
  ].filter((item) => can(role, item.need));

  return <div className="space-y-7">
    <section className="flex flex-col gap-4 rounded-xl2 border border-line bg-paper p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Resumo de hoje</p><h2 className="mt-1 font-display text-2xl font-semibold">Olá, {firstName}. O que precisa da sua atenção?</h2><p className="mt-1 text-sm text-ink-muted">As pendências mais importantes aparecem primeiro e levam direto à ação.</p></div>
      <div className="shrink-0 rounded-2xl bg-emerald-50 px-5 py-3 text-center"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Vendas hoje</p><p className="mt-1 font-display text-2xl font-bold text-emerald-800">{formatBRL(summary.salesToday.cents)}</p><p className="text-xs text-emerald-700">{summary.salesToday.count} pedido(s) confirmado(s)</p></div>
    </section>

    <section><div className="mb-3"><h2 className="font-display text-lg font-semibold">Central de pendências</h2><p className="text-xs text-ink-muted">Atualizada com os dados atuais da loja</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {priorities.map((item) => <Link key={item.label} href={item.href} className={`group relative overflow-hidden rounded-xl2 border bg-paper p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop ${item.value > 0 ? "border-brand/30" : "border-line"}`}><div className="flex items-center justify-between"><span className={`grid h-9 min-w-9 place-items-center rounded-xl px-2 font-display text-lg font-bold ${item.value > 0 ? "bg-brand text-white" : "bg-mist text-ink-muted"}`}>{item.value}</span><span className="text-sm text-brand opacity-0 transition group-hover:opacity-100">Abrir →</span></div><p className="mt-3 text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs leading-5 text-ink-muted">{item.value === 0 ? "Tudo em dia por aqui." : item.description}</p></Link>)}
    </div></section>

    <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
      <section className="overflow-hidden rounded-xl2 border border-line bg-paper shadow-card"><div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="font-display text-lg font-semibold">Pedidos recentes</h2><p className="text-xs text-ink-muted">Movimentação mais nova da loja</p></div><Link href="/painel/pedidos" className="text-sm font-semibold text-brand hover:underline">Ver todos</Link></div>
        {summary.recentOrders.length === 0 ? <p className="p-6 text-sm text-ink-muted">Ainda não há pedidos.</p> : <ul className="divide-y divide-line">{summary.recentOrders.map((order) => <li key={order.id}><Link href={`/painel/pedidos/${order.id}`} className="grid gap-2 px-5 py-3.5 hover:bg-mist sm:grid-cols-[90px_1fr_auto_auto] sm:items-center"><span className="font-mono text-xs font-semibold">#{order.id.slice(-8)}</span><span className="min-w-0 truncate text-sm">{order.email}</span><OrderStatusBadge status={order.status} /><span className="text-sm font-semibold sm:pl-3">{formatBRL(order.totalCents)}</span></Link></li>)}</ul>}
      </section>
      <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card"><div className="flex items-start justify-between"><div><h2 className="font-display text-lg font-semibold">Saúde do catálogo</h2><p className="text-xs text-ink-muted">{summary.activeProducts} produtos ativos</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${summary.lowStockCount ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{summary.lowStockCount ? `${summary.lowStockCount} alertas` : "Estoque OK"}</span></div>
        {summary.lowStockProducts.length === 0 ? <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Nenhum produto ativo com 5 unidades ou menos.</div> : <ul className="mt-4 space-y-2">{summary.lowStockProducts.map((product) => <li key={product.id}><Link href={`/painel/produtos/${product.id}`} className="flex items-center gap-3 rounded-xl border border-line p-2 hover:border-brand hover:bg-brand-soft/30">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={product.imageUrl} alt="" className="h-10 w-10 rounded-lg bg-mist object-cover" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{product.name}</span><span className={`rounded-lg px-2 py-1 text-xs font-bold ${product.stock === 0 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{product.stock} un.</span></Link></li>)}</ul>}
        <Link href="/painel/produtos" className="mt-4 inline-flex text-sm font-semibold text-brand hover:underline">Revisar catálogo →</Link></section>
    </div>

    <section><h2 className="mb-3 font-display text-lg font-semibold">Ações rápidas</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{actions.map((action) => <Link key={action.title} href={action.href} className="group flex items-center gap-3 rounded-xl2 border border-line bg-paper p-4 shadow-card transition hover:border-brand hover:bg-brand-soft/30"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft font-display text-lg font-bold text-brand transition group-hover:bg-brand group-hover:text-white">{action.icon}</span><span><span className="block text-sm font-semibold">{action.title}</span><span className="mt-0.5 block text-xs text-ink-muted">{action.desc}</span></span></Link>)}</div></section>
    <section className="rounded-xl2 bg-gradient-to-r from-slate-900 to-brand-dark p-5 text-white shadow-card"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Desempenho do mês</p><p className="mt-1 font-display text-3xl font-bold">{formatBRL(summary.salesMonth.cents)}</p><p className="text-sm text-white/65">{summary.salesMonth.count} pedido(s) com pagamento confirmado</p></div>{summary.awaitingApproval > 0 && <Link href="/painel/pedidos?status=AGUARDANDO_PAGAMENTO" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/20">{summary.awaitingApproval} pagamento(s) aguardando confirmação →</Link>}</div></section>
  </div>;
}
