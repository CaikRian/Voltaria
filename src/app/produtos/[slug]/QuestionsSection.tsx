import type { getCurrentUser } from "@/lib/auth-helpers";
import { getProductQuestions } from "@/lib/questions";
import { can } from "@/lib/permissions";
import { askQuestionAction } from "@/lib/actions/questions";
import { QuestionForm } from "./QuestionForm";

type Props = {
  productId: string;
  productSlug: string;
  user: Awaited<ReturnType<typeof getCurrentUser>>;
};

export async function QuestionsSection({ productId, productSlug, user }: Props) {
  const questions = await getProductQuestions(productId);
  const canAsk = can(user?.role, "question:ask");
  const action = askQuestionAction.bind(null, productId, productSlug);

  return (
    <section className="mt-16">
      <h2 className="mb-4 font-display text-2xl font-semibold">Dúvidas</h2>

      {canAsk && (
        <div className="mb-6">
          <QuestionForm action={action} />
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {questions.length === 0 && (
          <li className="text-sm text-ink-muted">Ainda não há perguntas sobre este produto.</li>
        )}
        {questions.map((q) => (
          <li key={q.id} className="rounded-xl2 border border-line bg-paper p-4">
            <p className="text-sm font-medium">{q.user.name ?? "Cliente Voltaria"} perguntou:</p>
            <p className="mt-1 text-sm text-ink-soft">{q.question}</p>
            {q.answer ? (
              <div className="mt-3 rounded-lg bg-mist p-3">
                <p className="text-xs font-medium text-ink-muted">Resposta de {q.answeredBy}</p>
                <p className="mt-1 text-sm">{q.answer}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">Aguardando resposta do vendedor.</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
