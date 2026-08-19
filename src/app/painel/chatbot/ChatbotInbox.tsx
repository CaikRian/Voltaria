import Link from "next/link";
import { getAdminChatSessions } from "@/lib/admin";

export type ChatbotFilters = { filtro?: string; q?: string; page?: string };

function href(current: ChatbotFilters, changes: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries({ ...current, ...changes }).forEach(([key, value]) => { if (value !== undefined && value !== "" && value !== "all") params.set(key, String(value)); });
  return `/painel/chatbot?${params}`;
}

function date(value: Date) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

export async function ChatbotInbox({ filters }: { filters: ChatbotFilters }) {
  const queue = ["waiting", "open", "closed", "all"].includes(filters.filtro ?? "") ? (filters.filtro as "waiting" | "open" | "closed" | "all") : "waiting";
  const data = await getAdminChatSessions({ queue, q: filters.q, page: Math.max(Number(filters.page) || 1, 1), pageSize: 10 });
  const page = Math.min(data.page, data.pageCount);
  const current = { ...filters, filtro: queue };
  const tabs = [
    { value: "waiting", label: "Aguardando equipe", count: data.counts.waiting },
    { value: "open", label: "Em andamento", count: data.counts.open },
    { value: "closed", label: "Encerradas", count: data.counts.closed },
    { value: "all", label: "Todas", count: data.total },
  ];
  const from = data.total ? (page - 1) * data.pageSize + 1 : 0;
  const to = Math.min(page * data.pageSize, data.total);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-brand-dark to-emerald-700 p-6 text-white shadow-pop sm:p-7">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-white/60">Widget flutuante da loja</p>
            <h1 className="mt-2 font-display text-3xl font-bold">Chat-bot</h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">Conversas que a Bia (bot da loja) encaminhou pra um atendente, com os dados que a pessoa preencheu antes de falar com você.</p>
          </div>
          <div className="rounded-2xl bg-amber-400 px-5 py-3 text-slate-950"><p className="text-[10px] font-bold uppercase tracking-wide opacity-60">Aguardando resposta</p><p className="mt-1 text-2xl font-black">{data.counts.waiting}</p></div>
        </div>
      </section>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Link key={tab.value} href={href(current, { filtro: tab.value, page: 1 })} className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${queue === tab.value ? "border-slate-900 bg-slate-900 text-white shadow-card" : "border-line bg-paper hover:border-brand hover:text-brand"}`}>
            <span>{tab.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${queue === tab.value ? "bg-white/15" : "bg-mist text-ink-muted"}`}>{tab.count}</span>
          </Link>
        ))}
      </nav>

      <section className="rounded-xl2 border border-line bg-paper p-4 shadow-card">
        <form className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto]">
          <input type="hidden" name="filtro" value={queue} />
          <input name="q" defaultValue={filters.q} placeholder="Nome, e-mail ou nº de pedido..." className="h-11 rounded-xl border border-line bg-mist px-4 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10" />
          <button className="h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-dark">Buscar</button>
        </form>
        {filters.q && <div className="mt-3 flex justify-end"><Link href={`/painel/chatbot?filtro=${queue}`} className="text-xs font-semibold text-brand hover:underline">Limpar busca</Link></div>}
      </section>

      {!data.sessions.length ? (
        <div className="grid place-items-center rounded-xl2 border border-dashed border-line bg-paper py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-xl text-emerald-800">✓</span>
          <p className="mt-3 font-semibold">Nenhuma conversa nesta fila</p>
          <p className="mt-1 text-sm text-ink-muted">Quando alguém pedir pra falar com um atendente pelo widget, aparece aqui.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {data.sessions.map((session) => {
            const last = session.messages[0];
            const needsReply = session.awaitingReplyFrom === "STAFF" && !session.chatClosedAt;
            return (
              <li key={session.id}>
                <Link href={`/painel/chatbot/${session.id}`} className={`group block overflow-hidden rounded-xl2 border bg-paper shadow-card transition hover:-translate-y-0.5 hover:shadow-pop ${needsReply ? "border-amber-300" : "border-line"}`}>
                  <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(160px,.6fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-brand">#{session.id.slice(-8).toUpperCase()}</span>
                        <span className="rounded-full bg-mist px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-soft">{session.reason}</span>
                        {needsReply ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Responder agora</span>
                          : session.chatClosedAt ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">Encerrada</span>
                          : <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">Aguardando visitante</span>}
                      </div>
                      <p className="mt-3 truncate text-sm font-bold">{session.name || session.email}</p>
                      <p className="truncate text-xs text-ink-muted">{session.email}{session.orderRef ? ` · pedido ${session.orderRef}` : ""}</p>
                      <div className={`mt-3 rounded-xl px-3 py-2.5 ${needsReply ? "bg-amber-50" : "bg-mist/70"}`}>
                        <p className="truncate text-sm text-ink-soft"><strong>{last?.senderRole === "VISITANTE" ? "Visitante:" : "Equipe:"}</strong> {last?.text ?? "—"}</p>
                      </div>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{session._count.messages} mensagem(ns)</p>
                      <p className="mt-1 text-xs text-ink-muted">{date(session.updatedAt)}</p>
                    </div>
                    <span className={`justify-self-start rounded-xl px-4 py-2 text-xs font-bold transition group-hover:translate-x-1 lg:justify-self-end ${needsReply ? "bg-amber-400 text-slate-950" : "bg-brand-soft text-brand"}`}>{needsReply ? "Responder agora →" : "Ver conversa →"}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <nav className="flex flex-col gap-3 rounded-xl2 border border-line bg-paper px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between" aria-label="Paginação">
        <p className="text-sm text-ink-muted">Mostrando <strong className="text-ink">{from}–{to}</strong> de <strong className="text-ink">{data.total}</strong></p>
        <div className="flex items-center gap-2">
          <Page href={href(current, { page: 1 })} disabled={page <= 1} label="Primeira">«</Page>
          <Page href={href(current, { page: Math.max(1, page - 1) })} disabled={page <= 1} label="Anterior">‹</Page>
          <span className="min-w-28 text-center text-sm font-semibold">Página {page} de {data.pageCount}</span>
          <Page href={href(current, { page: Math.min(data.pageCount, page + 1) })} disabled={page >= data.pageCount} label="Próxima">›</Page>
          <Page href={href(current, { page: data.pageCount })} disabled={page >= data.pageCount} label="Última">»</Page>
        </div>
      </nav>
    </div>
  );
}

function Page({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  return <Link href={href} aria-label={label} className={`grid h-9 w-9 place-items-center rounded-lg border border-line ${disabled ? "pointer-events-none opacity-35" : "hover:border-brand hover:text-brand"}`}>{children}</Link>;
}
