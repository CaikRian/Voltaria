import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminChatSession } from "@/lib/admin";
import { requireStaff } from "@/lib/auth-helpers";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { StaffChatPanel } from "../StaffChatPanel";

export const metadata: Metadata = { title: "Atendimento · Chat-bot · Painel" };

type Params = Promise<{ id: string }>;

function dateTime(value: Date) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

export default async function PainelChatbotSessionPage({ params }: { params: Params }) {
  await requireStaff();
  const { id } = await params;
  const session = await getAdminChatSession(id);
  if (!session) notFound();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-900 via-brand-dark to-emerald-700 p-6 text-white shadow-pop sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <Link href="/painel/chatbot" className="text-sm font-medium text-white/70 hover:text-white">← Voltar para o chat-bot</Link>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">{session.name || session.email}</h2>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">{session.reason}</span>
            {session.chatClosedAt && <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">Encerrada</span>}
          </div>
          <p className="mt-2 text-sm text-white/70">Iniciado em {dateTime(session.createdAt)}</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
            <h3 className="mb-3 font-display text-base font-semibold">Conversa</h3>
            <ul className="flex flex-col gap-3">
              {session.messages.map((message) => {
                const isVisitor = message.senderRole === "VISITANTE";
                return (
                  <li key={message.id} className={`flex ${isVisitor ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-2xl border p-3 text-sm shadow-sm ${isVisitor ? "rounded-bl-md border-line bg-white text-ink" : "rounded-br-md border-brand/30 bg-brand text-white"}`}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <strong className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${isVisitor ? "text-ink-muted" : "text-white/70"}`}>
                          {isVisitor ? "Visitante" : ROLE_LABELS[message.senderRole as Role] ?? message.senderRole}
                        </strong>
                        <span className={`text-[10px] ${isVisitor ? "text-ink-muted" : "text-white/70"}`}>{dateTime(message.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{message.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
            <h3 className="mb-3 font-display text-base font-semibold">Responder</h3>
            <StaffChatPanel sessionId={session.id} closed={!!session.chatClosedAt} />
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
            <h3 className="mb-3 font-display text-base font-semibold">Prévia do atendimento</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3"><dt className="text-ink-muted">Nome</dt><dd className="text-right font-medium text-ink">{session.name || "—"}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-ink-muted">E-mail</dt><dd className="text-right font-medium text-ink">{session.email}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-ink-muted">Motivo</dt><dd className="text-right font-medium text-ink">{session.reason}</dd></div>
              {session.orderRef && <div className="flex items-center justify-between gap-3"><dt className="text-ink-muted">Nº do pedido</dt><dd className="text-right font-mono font-medium text-ink">{session.orderRef}</dd></div>}
              {session.userId && <div className="flex items-center justify-between gap-3"><dt className="text-ink-muted">Conta</dt><dd className="text-right font-medium text-ink">Cliente logado</dd></div>}
            </dl>
            {session.userId && (
              <Link href={`/painel/clientes/${session.userId}`} className="mt-3 block text-center text-sm font-semibold text-brand hover:underline">Ver perfil do cliente →</Link>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
