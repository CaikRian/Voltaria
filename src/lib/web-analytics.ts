import { prisma } from "@/lib/prisma";

const TZ = "America/Sao_Paulo";
function day(value: Date) { return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(value); }
function labelPath(path: string) { if (path === "/") return "Página inicial"; if (path === "/produtos") return "Catálogo"; if (path.startsWith("/produtos/")) return "Produto"; if (path.startsWith("/checkout")) return `Checkout · ${path.split("/").pop()}`; if (path.startsWith("/conta")) return "Minha conta"; return path; }
function range(period: string, from?: string, to?: string) {
  const now = new Date();
  if (from && to) { const start = new Date(`${from}T00:00:00-03:00`); const end = new Date(`${to}T23:59:59.999-03:00`); if (!Number.isNaN(+start) && !Number.isNaN(+end) && +end >= +start && (+end - +start) <= 366 * 86400000) return { start, end, label: `${from} a ${to}` }; }
  const days = [7, 30, 90, 365].includes(Number(period)) ? Number(period) : 30;
  return { start: new Date(now.getTime() - (days - 1) * 86400000), end: now, label: `Últimos ${days} dias` };
}
function rank<T extends string>(values: T[]) { const map = new Map<T, number>(); values.forEach((value) => map.set(value, (map.get(value) ?? 0) + 1)); return [...map].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count); }

export async function getWebAnalytics(opts: { period?: string; from?: string; to?: string; page?: number; pageSize?: number }) {
  const selected = range(opts.period ?? "30", opts.from, opts.to);
  const where = { startedAt: { gte: selected.start, lte: selected.end } };
  const page = Math.max(opts.page ?? 1, 1); const pageSize = opts.pageSize ?? 12;
  const [visits, total, recent] = await Promise.all([
    prisma.websiteVisit.findMany({ where, select: { id: true, visitorId: true, sessionId: true, path: true, productId: true, productName: true, referrerHost: true, utmSource: true, device: true, browser: true, durationMs: true, startedAt: true }, orderBy: { startedAt: "asc" }, take: 100000 }),
    prisma.websiteVisit.count({ where }),
    prisma.websiteVisit.findMany({ where, orderBy: { startedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  const visitors = new Set(visits.map((visit) => visit.visitorId));
  const sessions = new Map<string, typeof visits>(); visits.forEach((visit) => sessions.set(visit.sessionId, [...(sessions.get(visit.sessionId) ?? []), visit]));
  const completed = visits.filter((visit) => visit.durationMs > 0);
  const avgDurationMs = completed.length ? Math.round(completed.reduce((sum, visit) => sum + visit.durationMs, 0) / completed.length) : 0;
  const bounced = [...sessions.values()].filter((items) => items.length === 1).length;
  const pageRows = rank(visits.map((visit) => visit.path)).map((item) => { const matching = visits.filter((visit) => visit.path === item.name); const durations = matching.filter((visit) => visit.durationMs > 0); return { path: item.name, label: labelPath(item.name), views: item.count, visitors: new Set(matching.map((visit) => visit.visitorId)).size, avgDurationMs: durations.length ? Math.round(durations.reduce((sum, visit) => sum + visit.durationMs, 0) / durations.length) : 0 }; });
  const productRows = rank(visits.filter((visit) => visit.productId).map((visit) => `${visit.productId}|||${visit.productName}`)).map((item) => { const [id, name] = item.name.split("|||"); const matching = visits.filter((visit) => visit.productId === id); return { id, name: name || "Produto", path: matching[0]?.path ?? "/produtos", views: item.count, visitors: new Set(matching.map((visit) => visit.visitorId)).size, avgDurationMs: Math.round(matching.reduce((sum, visit) => sum + visit.durationMs, 0) / Math.max(1, matching.filter((visit) => visit.durationMs > 0).length)) }; });
  const days: Array<{ date: string; views: number; visitors: number }> = []; const cursor = new Date(selected.start); while (cursor <= selected.end && days.length < 367) { const date = day(cursor); const matching = visits.filter((visit) => day(visit.startedAt) === date); days.push({ date, views: matching.length, visitors: new Set(matching.map((visit) => visit.visitorId)).size }); cursor.setDate(cursor.getDate() + 1); }
  const entries = rank([...sessions.values()].map((items) => items[0]?.path ?? "/"));
  const exits = rank([...sessions.values()].map((items) => items.at(-1)?.path ?? "/"));
  const checkoutSessions = [...sessions.values()].filter((items) => items.some((visit) => visit.path.startsWith("/checkout"))).length;
  const purchaseSessions = [...sessions.values()].filter((items) => items.some((visit) => visit.path === "/checkout/sucesso")).length;
  return {
    range: selected, total, sampled: total > visits.length, visitors: visitors.size, sessions: sessions.size, avgDurationMs, bounceRate: sessions.size ? Math.round(bounced / sessions.size * 100) : 0,
    pages: pageRows.slice(0, 12), products: productRows.slice(0, 10), daily: days,
    devices: rank(visits.map((visit) => visit.device)), browsers: rank(visits.map((visit) => visit.browser)),
    sources: rank(visits.map((visit) => visit.utmSource || visit.referrerHost || "Acesso direto")), entries: entries.slice(0, 6), exits: exits.slice(0, 6),
    funnel: { sessions: sessions.size, product: new Set(visits.filter((visit) => visit.productId).map((visit) => visit.sessionId)).size, checkout: checkoutSessions, purchase: purchaseSessions },
    recent, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}
