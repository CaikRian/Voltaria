import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const order = await prisma.order.findUnique({ where: { id }, select: { userId: true, email: true } });
  if (!order || (!isStaff(user.role) && order.userId !== user.id && order.email !== user.email)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const [last, count] = await Promise.all([
    prisma.orderMessage.findFirst({ where: { orderId: id }, orderBy: { createdAt: "desc" }, select: { id: true, senderRole: true, createdAt: true } }),
    prisma.orderMessage.count({ where: { orderId: id } }),
  ]);
  return NextResponse.json({ last, count }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
