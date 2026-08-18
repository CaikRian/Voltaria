import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability, getCurrentUser } from "@/lib/auth-helpers";
import { getAdminQuestions } from "@/lib/admin";
import { can } from "@/lib/permissions";
import { toggleQuestionVisibility } from "@/lib/actions/questions";
import { ToggleVisibilityButton } from "../ToggleVisibilityButton";
import { AnswerForm } from "./AnswerForm";

export const metadata: Metadata = { title: "Dúvidas · Painel" };

export default async function PainelDuvidasPage() {
  const [, user] = await Promise.all([requireCapability("question:answer"), getCurrentUser()]);
  const questions = await getAdminQuestions();
  const canModerate = can(user?.role, "content:moderate");

  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-semibold">Dúvidas</h2>

      {questions.length === 0 ? (
        <div className="grid place-items-center rounded-xl2 border border-dashed border-line py-16 text-center">
          <p className="text-sm text-ink-muted">Nenhuma pergunta ainda.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {questions.map((q) => (
            <li key={q.id} className="rounded-xl2 border border-line bg-paper p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/produtos/${q.product.slug}`} className="text-sm font-medium text-brand hover:underline">
                    {q.product.name}
                  </Link>
                  <p className="text-xs text-ink-muted">
                    {q.user.name ?? q.user.email} · {new Date(q.createdAt).toLocaleDateString("pt-BR")}
                    {q.hidden && <span className="ml-2 rounded bg-deal/10 px-1.5 py-0.5 text-[10px] font-medium text-deal">oculta</span>}
                  </p>
                </div>
                {canModerate && (
                  <ToggleVisibilityButton id={q.id} hidden={q.hidden} action={toggleQuestionVisibility} />
                )}
              </div>
              <p className="mt-2 text-sm">{q.question}</p>

              {q.answer ? (
                <div className="mt-3 rounded-lg bg-mist p-3">
                  <p className="text-xs font-medium text-ink-muted">Resposta de {q.answeredBy}</p>
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
