import type { getCurrentUser } from "@/lib/auth-helpers";
import { getProductReviews, getProductRatingSummary, hasVerifiedPurchase } from "@/lib/reviews";
import { can } from "@/lib/permissions";
import { StarRating } from "@/components/StarRating";
import { submitReviewAction } from "@/lib/actions/reviews";
import { ReviewsPanel } from "./ReviewsPanel";

type Props = {
  productId: string;
  productSlug: string;
  user: Awaited<ReturnType<typeof getCurrentUser>>;
};

export async function ReviewsSection({ productId, productSlug, user }: Props) {
  const [reviews, summary] = await Promise.all([
    getProductReviews(productId),
    getProductRatingSummary(productId),
  ]);

  const canWrite = can(user?.role, "review:write");
  const verified = canWrite && user ? await hasVerifiedPurchase(user.id, productId) : false;
  const myReview = user ? reviews.find((r) => r.userId === user.id) : undefined;
  const action = submitReviewAction.bind(null, productId, productSlug);

  return (
    <section className="mt-16">
      <h2 className="mb-4 font-display text-2xl font-semibold">Avaliações</h2>

      <div className="flex items-center gap-3">
        <StarRating value={summary.average} />
        <span className="text-sm text-ink-muted">
          {summary.average.toFixed(1)} de 5 · {summary.count}{" "}
          {summary.count === 1 ? "avaliação" : "avaliações"}
        </span>
      </div>

      {canWrite && !verified && (
        <p className="mt-4 text-sm text-ink-muted">Compre este produto para deixar uma avaliação.</p>
      )}

      <ReviewsPanel
        reviews={reviews}
        form={
          canWrite && verified && user
            ? {
                action,
                userId: user.id,
                userName: user.name ?? null,
                initialRating: myReview?.rating,
                initialComment: myReview?.comment ?? "",
              }
            : undefined
        }
      />
    </section>
  );
}
