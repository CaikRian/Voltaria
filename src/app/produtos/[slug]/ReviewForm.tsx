"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import type { ReviewFormState } from "@/lib/actions/reviews";

type Props = {
  action: (state: ReviewFormState, formData: FormData) => Promise<ReviewFormState>;
  initialRating?: number;
  initialComment?: string;
};

export function ReviewForm({ action, initialRating, initialComment }: Props) {
  const [state, formAction, pending] = useActionState<ReviewFormState, FormData>(action, {});

  return (
    <form action={formAction} className="rounded-xl2 border border-line bg-paper p-4">
      {state.error && (
        <p className="mb-3 rounded-lg bg-deal/10 px-3 py-2 text-sm text-deal">{state.error}</p>
      )}
      {state.success && (
        <p className="mb-3 rounded-lg bg-ok/10 px-3 py-2 text-sm text-ok">Avaliação enviada.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Nota</span>
          <select
            name="rating"
            defaultValue={initialRating ?? 5}
            className="h-11 rounded-xl border border-line px-3 text-sm focus:border-brand"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} estrela{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          {state.fieldErrors?.rating && (
            <span className="text-xs text-deal">{state.fieldErrors.rating[0]}</span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Comentário (opcional)</span>
          <textarea
            name="comment"
            defaultValue={initialComment}
            rows={3}
            placeholder="Conte como foi sua experiência com o produto..."
            className="rounded-xl border border-line px-4 py-3 text-sm focus:border-brand"
          />
          {state.fieldErrors?.comment && (
            <span className="text-xs text-deal">{state.fieldErrors.comment[0]}</span>
          )}
        </label>
      </div>

      <Button type="submit" disabled={pending} className="mt-3">
        {pending ? "Enviando..." : "Enviar avaliação"}
      </Button>
    </form>
  );
}
