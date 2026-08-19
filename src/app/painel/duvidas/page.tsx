import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability, getCurrentUser } from "@/lib/auth-helpers";
import { getAdminQuestions } from "@/lib/admin";
import { can } from "@/lib/permissions";
import { toggleQuestionVisibility } from "@/lib/actions/questions";
import { ToggleVisibilityButton } from "../ToggleVisibilityButton";
import { AnswerForm } from "./AnswerForm";

export const metadata: Metadata = { title: "Dúvidas · Painel" };

type SearchParams = Promise<{ filtro?: string }>;

export default async function PainelDuvidasPage({ searchParams }: { searchParams: SearchParams }) {
  const [, user] = await Promise.all([requireCapability("question:answer"), getCurrentUser()]);
  const questions = await getAdminQuestions();
  const canModerate = can(user?.role, "content:moderate");
  const { filtro = "pendentes" } = await searchParams;
  const pendingCount = questions.filter((question) => !question.answeredAt && !question.hidden).length;
  const answeredCount = questions.filter((question) => !!question.answeredAt).length;
  const visibleQuestions = questions.filter((question) => filtro === "pendentes" ? !question.answeredAt : filtro === "respondidas" ? !!question.answeredAt : true);

  return (
    <div className="space-y-5">
      <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Atendimento pré-venda</p><h2 className="mt-1 font-display text-2xl font-semibold">Dúvidas sobre produtos</h2><p className="mt-1 text-sm text-ink-muted">Respostas rápidas ajudam o cliente a decidir e ficam disponíveis na página do produto.</p></div><div className={`rounded-xl px-4 py-3 text-center ${pendingCount ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}><p className="font-display text-2xl font-bold">{pendingCount}</p><p className="text-xs font-semibold">aguardando resposta</p></div></div></section>

      <nav className="flex flex-wrap gap-2 text-sm">
        {[{ value: "pendentes", label: `Pendentes (${pendingCount})` }, { value: "respondidas", label: `Respondidas (${answeredCount})` }, { value: "todas", label: `Todas (${questions.length})` }].map((tab) => <Link key={tab.value} href={`/painel/duvidas?filtro=${tab.value}`} className={`rounded-xl border px-4 py-2 font-semibold ${filtro === tab.value ? "border-brand bg-brand text-white" : "border-line bg-paper hover:border-brand hover:text-brand"}`}>{tab.label}</Link>)}
      </nav>

      {visibleQuestions.length === 0 ? (
        <div className="grid place-items-center rounded-xl2 border border-dashed border-line py-16 text-center">
          <div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-xl text-emerald-800">✓</span><p className="mt-3 font-medium">Nenhuma dúvida nesta fila</p><p className="mt-1 text-sm text-ink-muted">Você está em dia com os clientes.</p></div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleQuestions.map((q) => (
            <li key={q.id} className={`rounded-xl2 border bg-paper p-5 shadow-card ${!q.answeredAt && !q.hidden ? "border-amber-300" : "border-line"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/produtos/${q.product.slug}`} className="text-sm font-medium text-brand hover:underline">
                    {q.product.name}
                  </Link>
                  <p className="mt-1 text-xs text-ink-muted">
                    {q.user.name ?? q.user.email} · {new Date(q.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
                    {!q.answeredAt && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">nova</span>}
                    {q.hidden && <span className="ml-2 rounded bg-deal/10 px-1.5 py-0.5 text-[10px] font-medium text-deal">oculta</span>}
                  </p>
                </div>
                {canModerate && (
                  <ToggleVisibilityButton id={q.id} hidden={q.hidden} action={toggleQuestionVisibility} />
                )}
              </div>
              <p className="mt-3 rounded-xl bg-mist p-3 text-sm leading-6">{q.question}</p>

              {q.answer ? (
                <div className="mt-3 rounded-lg bg-mist p-3">
                  <p className="text-xs font-medium text-ink-muted">Resposta de {q.answeredBy}{q.answeredAt ? ` · ${new Date(q.answeredAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}` : ""}</p>
                  <p className="mt-1 text-sm">{q.answer}</p>
                </div>
              ) : (
                <AnswerForm questionId={q.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
