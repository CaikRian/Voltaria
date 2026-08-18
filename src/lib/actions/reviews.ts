"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-helpers";
import { hasVerifiedPurchase } from "@/lib/reviews";
import { sanitizeText } from "@/lib/sanitize";
import { reviewSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export type ReviewFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

// productId/productSlug vêm via .bind na página (mesmo padrão de updateOrderStatusAction).
export async function submitReviewAction(
  productId: string,
  productSlug: string,
  _prev: ReviewFormState,
  formData: FormData
): Promise<ReviewFormState> {
  const user = await requireCapability("review:write");

  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const verified = await hasVerifiedPurchase(user.id, productId);
  if (!verified) {
    return { error: "Você só pode avaliar produtos que comprou (com pagamento confirmado)." };
  }

  const existingReview = await prisma.review.findUnique({
    where: { productId_userId: { productId, userId: user.id } },
    select: { id: true },
  });
  if (existingReview) {
    return { error: "Você já avaliou este produto. É permitida apenas uma avaliação por cliente." };
  }

  const comment = parsed.data.comment ? sanitizeText(parsed.data.comment) : null;

  try {
    await prisma.review.create({
      data: { productId, userId: user.id, rating: parsed.data.rating, comment },
    });
  } catch (error) {
    // A constraint única também protege duas submissões simultâneas.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Você já avaliou este produto. É permitida apenas uma avaliação por cliente." };
    }
    throw error;
  }

  revalidatePath(`/produtos/${productSlug}`);
  return { success: true };
}

// --- Moderação (GERENTE/ADMIN) ---
export async function toggleReviewVisibility(id: string, hidden: boolean) {
  await requireCapability("content:moderate");
  const review = await prisma.review.update({
    where: { id },
    data: { hidden },
    select: { product: { select: { slug: true } } },
  });
  revalidatePath("/painel/avaliacoes");
  revalidatePath(`/produtos/${review.product.slug}`);
}
