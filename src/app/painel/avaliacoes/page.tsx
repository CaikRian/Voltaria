import type { Metadata } from "next";
import Link from "next/link";
import { requireCapability } from "@/lib/auth-helpers";
import { getAdminReviews } from "@/lib/admin";
import { toggleReviewVisibility } from "@/lib/actions/reviews";
import { StarRating } from "@/components/StarRating";
import { ToggleVisibilityButton } from "../ToggleVisibilityButton";

export const metadata: Metadata = { title: "Avaliações · Painel" };

export default async function PainelAvaliacoesPage() {
  await requireCapability("content:moderate");
  const reviews = await getAdminReviews();

  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-semibold">Avaliações</h2>

      {reviews.length === 0 ? (
        <div className="grid place-items-center rounded-xl2 border border-dashed border-line py-16 text-center">
          <p className="text-sm text-ink-muted">Nenhuma avaliação ainda.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl2 border border-line bg-paper p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/produtos/${r.product.slug}`} className="text-sm font-medium text-brand hover:underline">
                    {r.product.name}
                  </Link>
                  <p className="text-xs text-ink-muted">
                    {r.user.name ?? r.user.email} · {new Date(r.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    {r.hidden && <span className="ml-2 rounded bg-deal/10 px-1.5 py-0.5 text-[10px] font-medium text-deal">oculta</span>}
                  </p>
                </div>
                <ToggleVisibilityButton id={r.id} hidden={r.hidden} action={toggleReviewVisibility} />
              </div>
              <div className="mt-2">
                <StarRating value={r.rating} />
              </div>
              {r.comment && <p className="mt-1 text-sm text-ink-soft">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
