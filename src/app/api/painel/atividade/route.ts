import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const [order, orderVersion, message, question, review, counts] = await Promise.all([
    prisma.order.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true, totalCents: true } }),
    prisma.order.findFirst({ orderBy: { updatedAt: "desc" }, select: { id: true, updatedAt: true, status: true } }),
    prisma.orderMessage.findFirst({ where: { senderRole: "CLIENTE" }, orderBy: { createdAt: "desc" }, select: { id: true, orderId: true, createdAt: true } }),
    prisma.question.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, product: { select: { name: true } }, createdAt: true } }),
    prisma.review.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, rating: true, product: { select: { name: true } }, createdAt: true } }),
    Promise.all([
      prisma.question.count({ where: { answeredAt: null, hidden: false } }),
      prisma.order.count({ where: { awaitingReplyFrom: "STAFF", chatClosedAt: null } }),
    ]),
  ]);

  return NextResponse.json({
    latest: {
      order: order ? { id: order.id, at: order.createdAt, totalCents: order.totalCents } : null,
      message: message ? { id: message.id, orderId: message.orderId, at: message.createdAt } : null,
      question: question ? { id: question.id, product: question.product.name, at: question.createdAt } : null,
      review: review ? { id: review.id, product: review.product.name, rating: review.rating, at: review.createdAt } : null,
    },
    counts: { questions: counts[0], conversations: counts[1] },
    version: orderVersion ? `${orderVersion.id}:${orderVersion.status}:${orderVersion.updatedAt.toISOString()}` : null,
    checkedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
