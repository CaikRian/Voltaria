"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { answerQuestionAction, type QuestionFormState } from "@/lib/actions/questions";

export function AnswerForm({ questionId }: { questionId: string }) {
  const action = answerQuestionAction.bind(null, questionId);
  const [state, formAction, pending] = useActionState<QuestionFormState, FormData>(action, {});

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      {state.error && <p className="text-xs text-deal">{state.error}</p>}
      <textarea
        name="answer"
        rows={2}
        placeholder="Escreva a resposta..."
        className="rounded-lg border border-line px-3 py-2 text-sm focus:border-brand"
      />
      {state.fieldErrors?.answer && <span className="text-xs text-deal">{state.fieldErrors.answer[0]}</span>}
      <Button type="submit" size="sm" disabled={pending} className="self-start">
        {pending ? "Enviando..." : "Responder"}
      </Button>
    </form>
  );
}
