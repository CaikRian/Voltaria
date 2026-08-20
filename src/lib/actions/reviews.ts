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

export async function submitOrderFeedbackAction(orderId: string, _prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const user = await requireCapability("review:write");
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id }, select: { id: true, status: true, feedback: { select: { id: true } }, items: { select: { productId: true, productName: true } } } });
  if (!order) return { error: "Pedido não encontrado." };
  if (order.status !== "ENTREGUE") return { error: "A avaliação fica disponível depois que a entrega é confirmada." };
  if (order.feedback) return { error: "Este pedido já foi avaliado." };

  const readRating = (name: string) => {
    const value = Number(formData.get(name));
    return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
  };
  const deliveryRating = readRating("deliveryRating");
  const serviceRating = readRating("serviceRating");
  const sellerRating = readRating("sellerRating");
  if (!deliveryRating || !serviceRating || !sellerRating) return { error: "Dê uma nota de 1 a 5 para entrega, loja e vendedor." };
  const commentRaw = String(formData.get("comment") || "").trim();
  if (commentRaw.length > 1500) return { error: "O comentário geral deve ter no máximo 1.500 caracteres." };
  const products = [...new Map(order.items.map((item) => [item.productId, item])).values()];
  const existing = await prisma.review.findMany({ where: { userId: user.id, productId: { in: products.map((item) => item.productId) } }, select: { productId: true } });
  const reviewed = new Set(existing.map((item) => item.productId));
  const productReviews: Array<{ productId: string; rating: number; comment: string | null }> = [];
  for (const product of products) {
    if (reviewed.has(product.productId)) continue;
    const rating = readRating(`productRating_${product.productId}`);
    if (!rating) return { error: `Dê uma nota para o produto ${product.productName}.` };
    const raw = String(formData.get(`productComment_${product.productId}`) || "").trim();
    if (raw.length > 1000) return { error: `O comentário de ${product.productName} deve ter no máximo 1.000 caracteres.` };
    productReviews.push({ productId: product.productId, rating, comment: raw ? sanitizeText(raw) : null });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.orderFeedback.create({ data: { orderId: order.id, userId: user.id, deliveryRating, serviceRating, sellerRating, comment: commentRaw ? sanitizeText(commentRaw) : null } });
      for (const review of productReviews) await tx.review.create({ data: { ...review, userId: user.id } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Esta avaliação já foi registrada." };
    throw error;
  }
  revalidatePath(`/conta/pedidos/${order.id}`);
  revalidatePath(`/painel/pedidos/${order.id}`);
  revalidatePath("/painel/avaliacoes");
  for (const product of products) {
    const found = await prisma.product.findUnique({ where: { id: product.productId }, select: { slug: true } });
    if (found) revalidatePath(`/produtos/${found.slug}`);
  }
  return { success: true };
}

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
