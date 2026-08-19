import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Poll público (visitante anônimo não tem sessão) — mesmo padrão de
// /api/pedidos/[id]/mensagens, mas a posse é validada por visitorId em vez de login.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visitorId = new URL(request.url).searchParams.get("visitorId");
  const user = await getCurrentUser();

  const session = await prisma.chatSession.findUnique({
    where: { id },
    select: { visitorId: true, awaitingReplyFrom: true, chatClosedAt: true },
  });
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (!isStaff(user?.role) && session.visitorId !== visitorId) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { id: true, senderRole: true, text: true, createdAt: true },
  });

  return NextResponse.json(
    { messages, count: messages.length, awaitingReplyFrom: session.awaitingReplyFrom, closed: !!session.chatClosedAt },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
