import type { Metadata } from "next";
import Link from "next/link";
import { getAdminConversations } from "@/lib/admin";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export const metadata: Metadata = { title: "Conversas · Painel" };
type SearchParams = Promise<{ filtro?: string }>;

export default async function ConversationsPage({ searchParams }: { searchParams: SearchParams }) {
  const { filtro = "open" } = await searchParams;
  const valid = ["open", "waiting", "closed", "all"].includes(filtro) ? filtro as "open" | "waiting" | "closed" | "all" : "open";
  const conversations = await getAdminConversations(valid);
  const waiting = conversations.filter((item) => item.awaitingReplyFrom === "STAFF" && !item.chatClosedAt).length;
  const tabs = [{ value: "open", label: "Em andamento" }, { value: "waiting", label: "Aguardando equipe" }, { value: "closed", label: "Encerradas" }, { value: "all", label: "Todas" }];

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-xl2 bg-gradient-to-br from-slate-900 via-brand-dark to-brand p-6 text-white shadow-pop"><div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Atendimento pós-compra</p><h2 className="mt-1 font-display text-3xl font-semibold">Central de conversas</h2><p className="mt-2 max-w-xl text-sm text-white/70">Todos os chats iniciados pelos clientes, organizados pelo que precisa de resposta.</p></div><div className="rounded-2xl bg-white/10 px-5 py-3 text-center backdrop-blur"><p className="font-display text-3xl font-bold">{waiting}</p><p className="text-xs text-white/70">aguardando você</p></div></div></section>
    <nav className="flex gap-2 overflow-x-auto pb-1">{tabs.map((tab) => <Link key={tab.value} href={`/painel/conversas?filtro=${tab.value}`} className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold ${valid === tab.value ? "border-brand bg-brand text-white" : "border-line bg-paper hover:border-brand"}`}>{tab.label}</Link>)}</nav>
    {conversations.length === 0 ? <div className="grid place-items-center rounded-xl2 border border-dashed border-line bg-paper py-16 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-800">✓</span><p className="mt-3 font-semibold">Nenhuma conversa nesta fila</p><p className="mt-1 text-sm text-ink-muted">Novas mensagens aparecerão automaticamente no painel.</p></div></div> : <ul className="space-y-3">{conversations.map((conversation) => {
      const last = conversation.messages[0]; const needsReply = conversation.awaitingReplyFrom === "STAFF" && !conversation.chatClosedAt;
      return <li key={conversation.id}><Link href={`/painel/pedidos/${conversation.id}#chat`} className={`group grid gap-3 rounded-xl2 border bg-paper p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop sm:grid-cols-[minmax(0,1fr)_auto] ${needsReply ? "border-amber-300" : "border-line"}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold">#{conversation.id.slice(-8)}</span><OrderStatusBadge status={conversation.status} />{needsReply && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Responder agora</span>}{conversation.chatClosedAt && <span className="rounded-full bg-mist px-2 py-1 text-[10px] font-semibold text-ink-muted">Encerrada</span>}</div><p className="mt-2 truncate text-sm font-semibold">{conversation.email}</p><p className="mt-1 truncate text-sm text-ink-muted"><span className="font-medium text-ink-soft">{last?.senderRole === "CLIENTE" ? "Cliente: " : "Equipe: "}</span>{last?.text}</p></div><div className="flex items-end justify-between gap-4 sm:flex-col sm:items-end"><span className="text-xs text-ink-muted">{last ? new Date(last.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""}</span><span className="text-xs font-semibold text-brand">{conversation._count.messages} mensagens · Abrir →</span></div></Link></li>;
    })}</ul>}
  </div>;
}
