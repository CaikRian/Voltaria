"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { QuestionFormState } from "@/lib/actions/questions";

type Props = {
  action: (state: QuestionFormState, formData: FormData) => Promise<QuestionFormState>;
};

export function QuestionForm({ action }: Props) {
  const [state, formAction, pending] = useActionState<QuestionFormState, FormData>(action, {});

  return (
    <form action={formAction} className="rounded-xl2 border border-line bg-paper p-4">
      {state.error && (
        <p className="mb-3 rounded-lg bg-deal/10 px-3 py-2 text-sm text-deal">{state.error}</p>
      )}
      {state.success && (
        <p className="mb-3 rounded-lg bg-ok/10 px-3 py-2 text-sm text-ok">
          Pergunta enviada — o vendedor vai responder em breve.
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Tem alguma dúvida sobre este produto?</span>
        <textarea
          name="question"
          rows={2}
          placeholder="Escreva sua pergunta..."
          className="rounded-xl border border-line px-4 py-3 text-sm focus:border-brand"
        />
        {state.fieldErrors?.question && (
          <span className="text-xs text-deal">{state.fieldErrors.question[0]}</span>
        )}
      </label>

      <Button type="submit" disabled={pending} className="mt-3">
        {pending ? "Enviando..." : "Perguntar"}
      </Button>
    </form>
  );
}
