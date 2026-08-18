"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth-helpers";
import { sanitizeText } from "@/lib/sanitize";
import { questionSchema, questionAnswerSchema } from "@/lib/validators";

export type QuestionFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

// productId/productSlug vêm via .bind na página.
export async function askQuestionAction(
  productId: string,
  productSlug: string,
  _prev: QuestionFormState,
  formData: FormData
): Promise<QuestionFormState> {
  const user = await requireCapability("question:ask");

  const parsed = questionSchema.safeParse({ question: formData.get("question") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  await prisma.question.create({
    data: { productId, userId: user.id, question: sanitizeText(parsed.data.question) },
  });

  revalidatePath(`/produtos/${productSlug}`);
  return { success: true };
}

// questionId vem via .bind na página do painel.
export async function answerQuestionAction(
  questionId: string,
  _prev: QuestionFormState,
  formData: FormData
): Promise<QuestionFormState> {
  const user = await requireCapability("question:answer");

  const parsed = questionAnswerSchema.safeParse({ answer: formData.get("answer") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const question = await prisma.question.update({
    where: { id: questionId },
    data: {
      answer: sanitizeText(parsed.data.answer),
      answeredBy: user.name ?? user.email,
      answeredAt: new Date(),
    },
    select: { product: { select: { slug: true } } },
  });

  revalidatePath("/painel/duvidas");
  revalidatePath(`/produtos/${question.product.slug}`);
  return { success: true };
}

// --- Moderação (GERENTE/ADMIN) ---
export async function toggleQuestionVisibility(id: string, hidden: boolean) {
  await requireCapability("content:moderate");
  const question = await prisma.question.update({
    where: { id },
    data: { hidden },
    select: { product: { select: { slug: true } } },
  });
  revalidatePath("/painel/duvidas");
  revalidatePath(`/produtos/${question.product.slug}`);
}
