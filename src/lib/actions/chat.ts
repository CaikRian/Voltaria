"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireStaff } from "@/lib/auth-helpers";
import { chatEscalationSchema, chatMessageSchema } from "@/lib/validators";

export type ChatEscalationState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  sessionId?: string;
};

export type ChatMessageState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

// Fluxo público — sem requireUser(), mesmo padrão de guest checkout em
// createOrderAction (src/lib/actions/orders.ts). Visitante anônimo pode escalar
// pra atendimento humano; se estiver logado, a conta é linkada automaticamente.
export async function startChatEscalationAction(
  _prev: ChatEscalationState,
  formData: FormData
): Promise<ChatEscalationState> {
  const parsed = chatEscalationSchema.safeParse({
    visitorId: formData.get("visitorId"),
    name: formData.get("name") ?? "",
    email: formData.get("email"),
    reason: formData.get("reason"),
    orderRef: formData.get("orderRef") ?? "",
    message: formData.get("message"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const user = await getCurrentUser();
  const { visitorId, name, email, reason, orderRef, message } = parsed.data;

  const session = await prisma.chatSession.create({
    data: {
      visitorId,
      userId: user?.id ?? null,
      name: name || user?.name || null,
      email,
      reason,
      orderRef: orderRef || null,
      awaitingReplyFrom: "STAFF",
      chatWaitingSince: new Date(),
      messages: { create: { senderRole: "VISITANTE", text: message } },
    },
    select: { id: true },
  });

  revalidatePath("/painel/chatbot");
  return { sessionId: session.id };
}

// Visitante manda mais mensagens numa sessão já aberta. visitorId confere posse —
// mesmo nível de segurança que o resto do fluxo de guest checkout já tem.
export async function sendChatVisitorMessageAction(
  sessionId: string,
  visitorId: string,
  _prev: ChatMessageState,
  formData: FormData
): Promise<ChatMessageState> {
  const parsed = chatMessageSchema.safeParse({ text: formData.get("text") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { visitorId: true, chatClosedAt: true },
  });
  if (!session || session.visitorId !== visitorId) return { error: "Conversa não encontrada." };
  if (session.chatClosedAt) return { error: "Esta conversa foi encerrada." };

  await prisma.chatMessage.create({ data: { sessionId, senderRole: "VISITANTE", text: parsed.data.text } });
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { awaitingReplyFrom: "STAFF", chatWaitingSince: new Date() },
  });

  revalidatePath("/painel/chatbot");
  revalidatePath(`/painel/chatbot/${sessionId}`);
  return { success: true };
}

// Equipe responde — qualquer staff pode (mesma convenção de "Conversas": sem
// capability nova, protegido só por requireStaff() já no layout do painel).
export async function sendChatStaffMessageAction(
  sessionId: string,
  _prev: ChatMessageState,
  formData: FormData
): Promise<ChatMessageState> {
  const staff = await requireStaff();
  const parsed = chatMessageSchema.safeParse({ text: formData.get("text") });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const session = await prisma.chatSession.findUnique({ where: { id: sessionId }, select: { id: true } });
  if (!session) return { error: "Conversa não encontrada." };

  await prisma.chatMessage.create({ data: { sessionId, senderRole: staff.role, text: parsed.data.text } });
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { awaitingReplyFrom: "VISITANTE", chatWaitingSince: null, chatClosedAt: null },
  });

  revalidatePath("/painel/chatbot");
  revalidatePath(`/painel/chatbot/${sessionId}`);
  return { success: true };
}

export async function closeChatSessionAction(sessionId: string) {
  await requireStaff();
  await prisma.chatSession.update({ where: { id: sessionId }, data: { chatClosedAt: new Date() } });
  revalidatePath("/painel/chatbot");
  revalidatePath(`/painel/chatbot/${sessionId}`);
}
