import Link from "next/link";
import { getAdminOrders } from "@/lib/admin";
import { formatBRL } from "@/lib/format";
import { ORDER_STATUS, STATUS_META } from "@/lib/order-status";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export type OrderFilters = { q?: string; status?: string; chat?: string; payment?: string; sort?: string; page?: string; pageSize?: string };

function url(current: OrderFilters, changes: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries({ ...current, ...changes }).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") query.set(key, String(value));
  });
  return `/painel/pedidos?${query}`;
}

function ChatState({ count, closed, waiting }: { count: number; closed: Date | null; waiting: string | null }) {
  if (!count) return <span className="text-xs text-ink-muted">Não iniciado</span>;
  if (closed) return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Encerrado</span>;
  if (waiting === "STAFF") return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />Equipe responde</span>;
  return <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Aguardando cliente</span>;
}

export async function OrdersDashboard({ filters }: { filters: OrderFilters }) {
  const pageSize = [10, 20, 30].includes(Number(filters.pageSize)) ? Number(filters.pageSize) : 10;
  const result = await getAdminOrders({ q: filters.q, status: filters.status, chat: filters.chat as never, payment: filters.payment as never, sort: filters.sort as never, page: Math.max(Number(filters.page) || 1, 1), pageSize });
  const page = Math.min(result.page, result.pageCount);
  const current = { ...filters, pageSize: String(pageSize) };
  const from = result.total ? (page - 1) * result.pageSize + 1 : 0;
  const to = Math.min(page * result.pageSize, result.total);
  const filtered = filters.q || filters.status || (filters.chat && filters.chat !== "all") || (filters.payment && filters.payment !== "all");

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-slate-900 to-brand-dark p-6 text-white shadow-pop sm:p-7">
      <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-brand/30 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-white/50">Operação da loja</p><h1 className="mt-2 font-display text-3xl font-bold">Central de pedidos</h1><p className="mt-2 max-w-xl text-sm text-white/65">Encontre o que precisa de ação, acompanhe pagamentos e mantenha cada atendimento sob controle.</p></div>
        <div className="grid grid-cols-3 gap-2"><Metric label="Resultado" value={result.total} /><Metric label="Chats abertos" value={result.openChats} /><Link href="/painel/conversas?filter=waiting" className="rounded-2xl bg-amber-400 px-4 py-3 text-slate-950 transition hover:bg-amber-300"><p className="text-[10px] font-bold uppercase tracking-wide opacity-60">Responder</p><p className="mt-1 text-xl font-black">{result.waitingStaff}</p></Link></div>
      </div>
    </section>

    <section className="rounded-xl2 border border-line bg-paper p-4 shadow-card sm:p-5">
      <form className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(150px,1fr))_auto]">
        <input name="q" defaultValue={filters.q} placeholder="Pedido, cliente ou e-mail..." className="h-11 w-full rounded-xl border border-line bg-mist px-4 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10" />
        <select name="status" defaultValue={filters.status ?? ""} className="h-11 rounded-xl border border-line bg-white px-3 text-sm"><option value="">Todos os status</option>{Object.values(ORDER_STATUS).map((status) => <option key={status} value={status}>{STATUS_META[status].label}</option>)}</select>
        <select name="chat" defaultValue={filters.chat ?? "all"} className="h-11 rounded-xl border border-line bg-white px-3 text-sm"><option value="all">Qualquer chat</option><option value="waiting_staff">Aguardando equipe</option><option value="waiting_client">Aguardando cliente</option><option value="open">Chats abertos</option><option value="closed">Chats encerrados</option><option value="none">Sem conversa</option></select>
        <select name="payment" defaultValue={filters.payment ?? "all"} className="h-11 rounded-xl border border-line bg-white px-3 text-sm"><option value="all">Qualquer pagamento</option><option value="paid">Pagamento confirmado</option><option value="pending">Pendente ou recusado</option></select>
        <button className="h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-dark">Filtrar</button>
        <div className="flex flex-wrap items-center gap-2 lg:col-span-5"><span className="mr-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Ordenar:</span>{[["newest","Recentes"],["updated","Atualizados"],["highest","Maior valor"],["oldest","Antigos"]].map(([value,label]) => <Link key={value} href={url(current,{sort:value,page:1})} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${(filters.sort ?? "newest") === value ? "bg-slate-900 text-white" : "bg-mist text-ink-soft hover:bg-line"}`}>{label}</Link>)}{filtered && <Link href="/painel/pedidos" className="ml-auto text-xs font-semibold text-brand hover:underline">Limpar filtros</Link>}</div>
      </form>
    </section>

    {!result.orders.length ? <div className="grid place-items-center rounded-xl2 border border-dashed border-line bg-paper py-16 text-center"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-mist text-xl">⌕</div><p className="mt-3 font-semibold">Nenhum pedido encontrado</p><p className="mt-1 text-sm text-ink-muted">Tente remover algum filtro ou buscar por outro termo.</p></div> : <section className="overflow-hidden rounded-xl2 border border-line bg-paper shadow-card">
      <div className="hidden grid-cols-[105px_minmax(180px,1.3fr)_70px_115px_145px_155px_110px_24px] gap-3 border-b border-line bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-ink-muted xl:grid"><span>Pedido</span><span>Cliente</span><span>Itens</span><span>Total</span><span>Status</span><span>Atendimento</span><span>Atualização</span><span /></div>
      <ul className="divide-y divide-line">{result.orders.map((order) => <li key={order.id}><Link href={`/painel/pedidos/${order.id}`} className="group grid gap-3 px-4 py-4 transition hover:bg-brand-soft/20 sm:grid-cols-2 xl:grid-cols-[105px_minmax(180px,1.3fr)_70px_115px_145px_155px_110px_24px] xl:items-center xl:px-5">
        <div><span className="font-mono text-sm font-bold text-brand">#{order.id.slice(-8)}</span><p className="mt-1 text-[11px] text-ink-muted xl:hidden">{date(order.createdAt)}</p></div>
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{order.shipName || order.email.split("@")[0]}</p><p className="truncate text-xs text-ink-muted">{order.email}</p>{order.shipCity && <p className="mt-1 truncate text-[11px] text-ink-muted">{order.shipCity}/{order.shipState}</p>}</div>
        <div className="hidden xl:block"><p className="text-sm font-semibold">{order._count.items}</p><p className="text-[11px] text-ink-muted">produto(s)</p></div>
        <div><p className="text-sm font-bold">{formatBRL(order.totalCents)}</p><p className="text-[11px] capitalize text-ink-muted">{order.mpPaymentMethod?.replaceAll("_", " ") || "não informado"}</p></div>
        <div><OrderStatusBadge status={order.status} /></div>
        <div><ChatState count={order._count.messages} closed={order.chatClosedAt} waiting={order.awaitingReplyFrom} />{order._count.messages > 0 && <p className="mt-1 text-[11px] text-ink-muted">{order._count.messages} mensagem(ns)</p>}</div>
        <div className="hidden xl:block"><p className="text-xs font-medium">{date(order.updatedAt)}</p><p className="text-[11px] text-ink-muted">{time(order.updatedAt)}</p></div><span className="hidden text-xl text-ink-muted transition group-hover:translate-x-1 group-hover:text-brand xl:block">›</span>
      </Link></li>)}</ul>
    </section>}

    <nav className="flex flex-col gap-3 rounded-xl2 border border-line bg-paper px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between" aria-label="Paginação"><p className="text-sm text-ink-muted">Mostrando <strong className="text-ink">{from}–{to}</strong> de <strong className="text-ink">{result.total}</strong></p><div className="flex items-center justify-between gap-2"><PageLink label="Primeira" disabled={page<=1} href={url(current,{page:1})}>«</PageLink><PageLink label="Anterior" disabled={page<=1} href={url(current,{page:Math.max(1,page-1)})}>‹</PageLink><span className="min-w-28 text-center text-sm font-semibold">Página {page} de {result.pageCount}</span><PageLink label="Próxima" disabled={page>=result.pageCount} href={url(current,{page:Math.min(result.pageCount,page+1)})}>›</PageLink><PageLink label="Última" disabled={page>=result.pageCount} href={url(current,{page:result.pageCount})}>»</PageLink></div></nav>
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><p className="text-[10px] uppercase tracking-wide text-white/55">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>; }
function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) { return <Link aria-label={label} href={href} className={`grid h-9 w-9 place-items-center rounded-lg border border-line ${disabled ? "pointer-events-none opacity-35" : "hover:border-brand hover:text-brand"}`}>{children}</Link>; }
function date(value: Date) { return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }); }
function time(value: Date) { return new Date(value).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }); }
