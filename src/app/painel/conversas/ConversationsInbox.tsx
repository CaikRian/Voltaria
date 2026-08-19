import Link from "next/link";
import { getAdminConversations } from "@/lib/admin";
import { formatBRL } from "@/lib/format";
import { ORDER_STATUS, STATUS_META } from "@/lib/order-status";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export type ConversationFilters = { filtro?: string; q?: string; status?: string; sort?: string; page?: string };

function href(current: ConversationFilters, changes: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries({ ...current, ...changes }).forEach(([key, value]) => { if (value !== undefined && value !== "" && value !== "all") params.set(key, String(value)); });
  return `/painel/conversas?${params}`;
}

function cleanMessage(text?: string) {
  if (!text) return "Sem conteúdo";
  return text.replace(/\[\[imagem:[^\]]+\]\]/g, "📷 Imagem anexada").replace(/\*\*/g, "").trim();
}

export async function ConversationsInbox({ filters }: { filters: ConversationFilters }) {
  const queue = ["open", "waiting", "customer", "closed", "all"].includes(filters.filtro ?? "") ? filters.filtro! : "open";
  const data = await getAdminConversations({ queue: queue as never, q: filters.q, status: filters.status, sort: filters.sort as never, page: Math.max(Number(filters.page) || 1, 1), pageSize: 10 });
  const page = Math.min(data.page, data.pageCount);
  const current = { ...filters, filtro: queue };
  const tabs = [
    { value: "open", label: "Em andamento", count: data.counts.open },
    { value: "waiting", label: "Aguardando equipe", count: data.counts.waiting },
    { value: "customer", label: "Aguardando cliente", count: data.counts.customer },
    { value: "closed", label: "Encerradas", count: data.counts.closed },
    { value: "all", label: "Todas", count: data.counts.open + data.counts.closed },
  ];
  const from = data.total ? (page - 1) * data.pageSize + 1 : 0;
  const to = Math.min(page * data.pageSize, data.total);

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-brand-dark to-brand p-6 text-white shadow-pop sm:p-7">
      <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-white/55">Atendimento pós-compra</p><h1 className="mt-2 font-display text-3xl font-bold">Central de conversas</h1><p className="mt-2 max-w-xl text-sm text-white/70">Uma visão organizada dos atendimentos, prioridades e clientes que aguardam retorno.</p></div><div className="grid grid-cols-3 gap-2"><HeroMetric label="Em andamento" value={data.counts.open} /><HeroMetric label="Aguardando cliente" value={data.counts.customer} /><div className="rounded-2xl bg-amber-400 px-4 py-3 text-slate-950"><p className="text-[10px] font-bold uppercase tracking-wide opacity-60">Responder agora</p><p className="mt-1 text-2xl font-black">{data.counts.waiting}</p></div></div></div>
    </section>

    <nav className="flex gap-2 overflow-x-auto pb-1">{tabs.map((tab) => <Link key={tab.value} href={href(current,{filtro:tab.value,page:1})} className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${queue === tab.value ? "border-slate-900 bg-slate-900 text-white shadow-card" : "border-line bg-paper hover:border-brand hover:text-brand"}`}><span>{tab.label}</span><span className={`rounded-full px-2 py-0.5 text-[10px] ${queue === tab.value ? "bg-white/15" : "bg-mist text-ink-muted"}`}>{tab.count}</span></Link>)}</nav>

    <section className="rounded-xl2 border border-line bg-paper p-4 shadow-card">
      <form className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_210px_190px_auto]">
        <input type="hidden" name="filtro" value={queue} /><input name="q" defaultValue={filters.q} placeholder="Pedido, nome ou e-mail..." className="h-11 rounded-xl border border-line bg-mist px-4 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10" />
        <select name="status" defaultValue={filters.status ?? ""} className="h-11 rounded-xl border border-line bg-white px-3 text-sm"><option value="">Todos os status do pedido</option>{Object.values(ORDER_STATUS).map((status) => <option key={status} value={status}>{STATUS_META[status].label}</option>)}</select>
        <select name="sort" defaultValue={filters.sort ?? "recent"} className="h-11 rounded-xl border border-line bg-white px-3 text-sm"><option value="recent">Atividade recente</option><option value="oldest">Há mais tempo sem ação</option><option value="messages">Mais mensagens</option><option value="order">Pedidos mais recentes</option></select>
        <button className="h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-dark">Aplicar filtros</button>
      </form>
      {(filters.q || filters.status || (filters.sort && filters.sort !== "recent")) && <div className="mt-3 flex justify-end"><Link href={`/painel/conversas?filtro=${queue}`} className="text-xs font-semibold text-brand hover:underline">Limpar busca e filtros</Link></div>}
    </section>

    {!data.conversations.length ? <div className="grid place-items-center rounded-xl2 border border-dashed border-line bg-paper py-16 text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-xl text-emerald-800">✓</span><p className="mt-3 font-semibold">Nenhuma conversa nesta fila</p><p className="mt-1 text-sm text-ink-muted">Não há atendimentos correspondentes aos filtros atuais.</p></div> : <ul className="grid gap-3">{data.conversations.map((chat) => {
      const last = chat.messages[0];
      const effectivelyClosed = Boolean(chat.chatClosedAt) || chat.status === "CANCELADO";
      const needsReply = chat.awaitingReplyFrom === "STAFF" && !effectivelyClosed;
      const waitingCustomer = chat.awaitingReplyFrom === "CLIENTE" && !effectivelyClosed;
      return <li key={chat.id}><Link href={`/painel/pedidos/${chat.id}#chat`} className={`group block overflow-hidden rounded-xl2 border bg-paper shadow-card transition hover:-translate-y-0.5 hover:shadow-pop ${needsReply ? "border-amber-300" : "border-line"}`}>
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(210px,.7fr)_auto] lg:items-center">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black text-brand">#{chat.id.slice(-8)}</span><OrderStatusBadge status={chat.status} />{needsReply ? <QueueBadge tone="amber">Equipe precisa responder</QueueBadge> : waitingCustomer ? <QueueBadge tone="blue">Aguardando cliente</QueueBadge> : <QueueBadge tone="gray">Conversa encerrada</QueueBadge>}</div><p className="mt-3 truncate text-sm font-bold">{chat.shipName || chat.email.split("@")[0]}</p><p className="truncate text-xs text-ink-muted">{chat.email}</p><div className={`mt-3 rounded-xl px-3 py-2.5 ${needsReply ? "bg-amber-50" : "bg-mist/70"}`}><p className="truncate text-sm text-ink-soft"><strong>{last?.senderRole === "CLIENTE" ? "Cliente:" : "Equipe:"}</strong> {cleanMessage(last?.text)}</p></div></div>
          <div className="grid grid-cols-3 gap-2 text-center lg:grid-cols-1 lg:text-left"><Info label="Pedido" value={formatBRL(chat.totalCents)} /><Info label="Itens" value={`${chat._count.items} produto(s)`} /><Info label="Conversa" value={`${chat._count.messages} mensagem(ns)`} /></div>
          <div className="flex items-end justify-between gap-4 lg:h-full lg:flex-col lg:items-end"><div className="text-left lg:text-right"><p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Última atividade</p><p className="mt-1 text-xs font-semibold">{last ? new Date(last.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}</p><p className="text-xs text-ink-muted">{last ? new Date(last.createdAt).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }) : ""}</p></div><span className={`rounded-xl px-4 py-2 text-xs font-bold transition group-hover:translate-x-1 ${needsReply ? "bg-amber-400 text-slate-950" : "bg-brand-soft text-brand"}`}>{needsReply ? "Responder agora →" : "Ver conversa →"}</span></div>
        </div>
      </Link></li>;
    })}</ul>}

    <nav className="flex flex-col gap-3 rounded-xl2 border border-line bg-paper px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between" aria-label="Paginação das conversas"><p className="text-sm text-ink-muted">Mostrando <strong className="text-ink">{from}–{to}</strong> de <strong className="text-ink">{data.total}</strong></p><div className="flex items-center gap-2"><Page href={href(current,{page:1})} disabled={page<=1} label="Primeira">«</Page><Page href={href(current,{page:Math.max(1,page-1)})} disabled={page<=1} label="Anterior">‹</Page><span className="min-w-28 text-center text-sm font-semibold">Página {page} de {data.pageCount}</span><Page href={href(current,{page:Math.min(data.pageCount,page+1)})} disabled={page>=data.pageCount} label="Próxima">›</Page><Page href={href(current,{page:data.pageCount})} disabled={page>=data.pageCount} label="Última">»</Page></div></nav>
  </div>;
}

function HeroMetric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"><p className="text-[10px] uppercase tracking-wide text-white/55">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>; }
function QueueBadge({ tone, children }: { tone: "amber" | "blue" | "gray"; children: React.ReactNode }) { const color = tone === "amber" ? "bg-amber-100 text-amber-800" : tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${color}`}>{children}</span>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-mist/70 px-3 py-2"><p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">{label}</p><p className="mt-0.5 truncate text-xs font-semibold">{value}</p></div>; }
function Page({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) { return <Link href={href} aria-label={label} className={`grid h-9 w-9 place-items-center rounded-lg border border-line ${disabled ? "pointer-events-none opacity-35" : "hover:border-brand hover:text-brand"}`}>{children}</Link>; }
