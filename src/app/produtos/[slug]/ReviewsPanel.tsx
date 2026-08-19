"use client";

import { useOptimistic } from "react";
import { AnimatePresence, motion } from "motion/react";
import { StarRating } from "@/components/StarRating";
import { ReviewForm } from "./ReviewForm";
import type { ReviewFormState } from "@/lib/actions/reviews";

// Formato mínimo renderizado — as linhas reais do Prisma satisfazem isso
// estruturalmente; a entrada otimista só precisa fabricar esses campos.
export type DisplayReview = {
  id: string;
  rating: number;
  comment: string | null;
  userId: string;
  createdAt: Date;
  user: { name: string | null };
  pending?: boolean;
};

type FormConfig = {
  action: (state: ReviewFormState, formData: FormData) => Promise<ReviewFormState>;
  userId: string;
  userName: string | null;
  initialRating?: number;
  initialComment?: string;
};

type Props = {
  reviews: DisplayReview[];
  form?: FormConfig; // undefined quando o usuário não pode/não deve escrever
};

export function ReviewsPanel({ reviews, form }: Props) {
  // Estado base = a prop `reviews` real. Assim que a transição que disparou o
  // otimismo assenta (sucesso OU erro), React volta pro estado base atual — que já
  // vai ser o novo (via revalidatePath) em caso de sucesso. É isso que faz a
  // reconciliação e a recuperação de erro funcionarem sem código extra.
  const [optimisticReviews, addOptimisticReview] = useOptimistic(
    reviews,
    (state, next: DisplayReview) => [next, ...state.filter((r) => r.userId !== next.userId)]
  );

  async function submitWithOptimism(
    prevState: ReviewFormState,
    formData: FormData
  ): Promise<ReviewFormState> {
    if (form) {
      const ratingRaw = Number(formData.get("rating"));
      addOptimisticReview({
        id: `optimistic-${form.userId}`,
        rating: Number.isFinite(ratingRaw) ? ratingRaw : 5,
        comment: (formData.get("comment") as string)?.trim() || null,
        userId: form.userId,
        createdAt: new Date(),
        user: { name: form.userName },
        pending: true,
      });
      return form.action(prevState, formData);
    }
    return prevState;
  }

  return (
    <>
      {form && (
        <div className="mt-6">
          {/* key força remontagem quando a review salva do usuário muda (ex.: depois
              de reenviar) — sem isso o <select defaultValue> ficava preso no valor
              do primeiro render, mesmo com uma nota nova já salva no servidor. */}
          <ReviewForm
            key={`${form.initialRating ?? "novo"}-${form.initialComment ?? ""}`}
            action={submitWithOptimism}
            initialRating={form.initialRating}
            initialComment={form.initialComment}
          />
        </div>
      )}

      <ul className="mt-8 flex flex-col gap-4">
        {optimisticReviews.length === 0 && (
          <li className="text-sm text-ink-muted">Ainda não há avaliações para este produto.</li>
        )}
        <AnimatePresence initial={false}>
          {optimisticReviews.map((r) => (
            <motion.li
              key={r.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: r.pending ? 0.7 : 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl2 border border-line bg-paper p-4"
            >
              <div className="flex items-center justify-between">
                <StarRating value={r.rating} />
                <span className="text-xs text-ink-muted">
                  {r.pending ? "Enviando..." : new Date(r.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium">{r.user.name ?? "Cliente Heca - Store"}</p>
              {r.comment && <p className="mt-1 text-sm text-ink-soft">{r.comment}</p>}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
}
