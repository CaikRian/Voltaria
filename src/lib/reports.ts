import { prisma } from "@/lib/prisma";

export const REPORT_PERIODS = ["7", "30", "90", "365", "all"] as const;
export type ReportPeriod = typeof REPORT_PERIODS[number];
export type ReportType = "sales" | "orders" | "products" | "customers" | "payments" | "service";
const paid = ["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO", "ENVIADO", "ENTREGUE"];

export async function getReports(period: ReportPeriod = "30") {
  const from = period === "all" ? undefined : new Date(Date.now() - Number(period) * 86400000);
  const where = from ? { createdAt: { gte: from } } : {};
  const [orders, products, newCustomers, reviews, questions] = await Promise.all([
    prisma.order.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ include: { variants: { select: { stock: true } }, category: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.user.count({ where: { role: "CLIENTE", ...(from ? { createdAt: { gte: from } } : {}) } }),
    prisma.review.findMany({ where, select: { rating: true, hidden: true, createdAt: true } }),
    prisma.question.findMany({ where, select: { answeredAt: true, hidden: true, createdAt: true } }),
  ]);
  const confirmed = orders.filter((order) => paid.includes(order.status));
  const revenue = confirmed.reduce((sum, order) => sum + order.totalCents, 0);
  const status = Object.entries(orders.reduce<Record<string, number>>((all, order) => ({ ...all, [order.status]: (all[order.status] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const payment = Object.entries(orders.reduce<Record<string, number>>((all, order) => ({ ...all, [order.mpPaymentMethod ?? "não informado"]: (all[order.mpPaymentMethod ?? "não informado"] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const productMap = new Map<string, { product: string; quantity: number; revenueCents: number }>();
  confirmed.flatMap((order) => order.items).forEach((item) => { const current = productMap.get(item.productId) ?? { product: item.productName, quantity: 0, revenueCents: 0 }; current.quantity += item.qty; current.revenueCents += item.unitCents * item.qty; productMap.set(item.productId, current); });
  const topProducts = [...productMap.values()].sort((a, b) => b.revenueCents - a.revenueCents);
  const inventory = products.map((product) => ({ product: product.name, category: product.category.name, active: product.active ? "Ativo" : "Inativo", stock: product.variants.length ? product.variants.reduce((sum, variant) => sum + variant.stock, 0) : product.stock, priceCents: product.priceCents })).sort((a, b) => a.stock - b.stock);
  const dailyMap = new Map<string, { revenueCents: number; orders: number }>();
  confirmed.forEach((order) => { const day = order.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }); const current = dailyMap.get(day) ?? { revenueCents: 0, orders: 0 }; current.revenueCents += order.totalCents; current.orders++; dailyMap.set(day, current); });
  const daily = [...dailyMap.entries()].reverse().slice(-31).map(([date, values]) => ({ date, ...values }));
  const ratingAverage = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  return {
    period, generatedAt: new Date(), from, orders, confirmed, revenue, averageTicket: confirmed.length ? Math.round(revenue / confirmed.length) : 0,
    cancelled: orders.filter((order) => order.status === "CANCELADO").length,
    refunds: orders.filter((order) => ["REEMBOLSO_SOLICITADO", "REEMBOLSADO"].includes(order.status)).length,
    newCustomers, reviews: reviews.length, ratingAverage, questions: questions.length,
    unansweredQuestions: questions.filter((question) => !question.answeredAt && !question.hidden).length,
    status, payment, topProducts, inventory, daily,
  };
}

export function reportRows(data: Awaited<ReturnType<typeof getReports>>, type: ReportType): Array<Record<string, string | number>> {
  if (type === "sales") return data.daily.map((row) => ({ Data: row.date, Pedidos: row.orders, "Faturamento (centavos)": row.revenueCents }));
  if (type === "orders") return data.orders.map((order) => ({ Pedido: order.id, Email: order.email, Status: order.status, "Total (centavos)": order.totalCents, Criado: order.createdAt.toISOString() }));
  if (type === "products") return data.inventory.map((row) => ({ Produto: row.product, Categoria: row.category, Situação: row.active, Estoque: row.stock, "Preço (centavos)": row.priceCents }));
  if (type === "payments") return data.payment.map(([method, count]) => ({ "Meio de pagamento": method, Pedidos: count }));
  if (type === "service") return [{ "Dúvidas recebidas": data.questions, "Dúvidas pendentes": data.unansweredQuestions, Avaliações: data.reviews, "Nota média": data.ratingAverage.toFixed(2), Reembolsos: data.refunds }];
  return [{ "Novos clientes": data.newCustomers, "Clientes compradores": new Set(data.orders.map((order) => order.email)).size, "Ticket médio (centavos)": data.averageTicket }];
}
