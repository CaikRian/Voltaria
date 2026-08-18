import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true, name: true, email: true, image: true, role: true, emailVerified: true, createdAt: true,
      addresses: true,
      orders: {
        include: {
          items: true,
          statusEvents: { orderBy: { createdAt: "asc" } },
          messages: { where: { userId: currentUser.id }, select: { text: true, senderRole: true, createdAt: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      reviews: { select: { productId: true, rating: true, comment: true, hidden: true, createdAt: true, updatedAt: true } },
      questions: { select: { productId: true, question: true, answer: true, createdAt: true } },
      accounts: { select: { provider: true, type: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });

  const body = JSON.stringify({ exportedAt: new Date().toISOString(), data: user }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="voltaria-meus-dados-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
