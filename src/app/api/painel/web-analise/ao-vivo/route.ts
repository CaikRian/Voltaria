import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireStaff();
  const checkedAt = new Date();
  const threshold = new Date(checkedAt.getTime() - 2 * 60 * 1000);
  const visits = await prisma.websiteVisit.findMany({
    where: { endedAt: null, lastSeenAt: { gte: threshold } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, visitorId: true, sessionId: true, path: true, productName: true, device: true, browser: true, referrerHost: true, utmSource: true, startedAt: true, lastSeenAt: true },
    take: 500,
  });
  const sessions = [...new Map(visits.map((visit) => [visit.sessionId, visit])).values()];
  const grouped = new Map<string, number>();
  sessions.forEach((visit) => grouped.set(visit.productName || visit.path, (grouped.get(visit.productName || visit.path) ?? 0) + 1));
  return NextResponse.json({
    checkedAt,
    total: sessions.length,
    visitors: new Set(sessions.map((visit) => visit.visitorId)).size,
    pages: [...grouped].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    sessions: sessions.slice(0, 30).map((visit) => ({
      id: visit.id,
      visitor: visit.visitorId.slice(0, 4).toUpperCase(),
      page: visit.productName || visit.path,
      path: visit.path,
      device: visit.device,
      browser: visit.browser,
      source: visit.utmSource || visit.referrerHost || "Acesso direto",
      startedAt: visit.startedAt,
      lastSeenAt: visit.lastSeenAt,
    })),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
