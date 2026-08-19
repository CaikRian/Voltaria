import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ID = /^[a-f0-9-]{20,50}$/i;
function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function POST(request: NextRequest) {
  if (/bot|crawler|spider|preview/i.test(request.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(await request.text()); } catch { return NextResponse.json({ error: "Payload inválido" }, { status: 400 }); }
  const type = body.type;
  const id = text(body.id, 50);
  if (!ID.test(id)) return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });

  if (type === "end") {
    const durationMs = Math.min(Math.max(Number(body.durationMs) || 0, 0), 30 * 60 * 1000);
    await prisma.websiteVisit.updateMany({ where: { id }, data: { durationMs, lastSeenAt: new Date(), endedAt: new Date() } });
    return new NextResponse(null, { status: 204 });
  }

  if (type === "ping") {
    await prisma.websiteVisit.updateMany({ where: { id, endedAt: null }, data: { lastSeenAt: new Date() } });
    return new NextResponse(null, { status: 204 });
  }

  const visitorId = text(body.visitorId, 50);
  const sessionId = text(body.sessionId, 50);
  const path = text(body.path, 180);
  if (type !== "start" || !ID.test(visitorId) || !ID.test(sessionId) || !path.startsWith("/") || path.startsWith("/painel") || path.startsWith("/api")) return NextResponse.json({ error: "Visita inválida" }, { status: 400 });
  const slug = path.match(/^\/produtos\/([^/]+)$/)?.[1];
  const product = slug ? await prisma.product.findUnique({ where: { slug: decodeURIComponent(slug) }, select: { id: true, name: true } }) : null;
  await prisma.websiteVisit.upsert({
    where: { id },
    update: { lastSeenAt: new Date(), endedAt: null },
    create: {
      id, visitorId, sessionId, path,
      productId: product?.id, productName: product?.name,
      referrerHost: text(body.referrerHost, 120) || null,
      utmSource: text(body.utmSource, 80) || null,
      device: ["Celular", "Tablet", "Desktop"].includes(String(body.device)) ? String(body.device) : "Outro",
      browser: text(body.browser, 40) || "Outro",
    },
  });
  return new NextResponse(null, { status: 204 });
}
