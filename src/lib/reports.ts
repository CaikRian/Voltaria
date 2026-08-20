import { prisma } from "@/lib/prisma";

export const REPORT_PERIODS = ["7", "30", "90", "365", "all"] as const;
export type ReportPeriod = typeof REPORT_PERIODS[number];
export type ReportType = "sales" | "orders" | "products" | "customers" | "payments" | "service";
const paid = ["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO", "ENVIADO", "ENTREGUE"];

export async function getReports(period: ReportPeriod = "30", custom?: { from?: Date; to?: Date }) {
  const from = custom?.from ?? (period === "all" ? undefined : new Date(Date.now() - Number(period) * 86400000));
  const to = custom?.to;
  const dateRange = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  const where = Object.keys(dateRange).length ? { createdAt: dateRange } : {};
  const [orders, products, customers, reviews, questions, orderFeedbacks] = await Promise.all([
    prisma.order.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ include: { variants: { select: { stock: true } }, category: { select: { name: true } } }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "CLIENTE", ...(Object.keys(dateRange).length ? { createdAt: dateRange } : {}) }, select: { id: true, name: true, email: true, createdAt: true, _count: { select: { orders: true, reviews: true, questions: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.review.findMany({ where, select: { rating: true, hidden: true, createdAt: true } }),
    prisma.question.findMany({ where, select: { answeredAt: true, hidden: true, createdAt: true } }),
    prisma.orderFeedback.findMany({ where, select: { orderId: true, deliveryRating: true, serviceRating: true, sellerRating: true, comment: true, createdAt: true } }),
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
  confirmed.forEach((order) => { const day = order.createdAt.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); const current = dailyMap.get(day) ?? { revenueCents: 0, orders: 0 }; current.revenueCents += order.totalCents; current.orders++; dailyMap.set(day, current); });
  const salesDaily = [...dailyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ date, ...values }));
  const chartEnd = to ?? new Date(); const requestedStart = from ?? new Date(chartEnd.getTime() - 30 * 86400000); const chartStart = new Date(Math.max(requestedStart.getTime(), chartEnd.getTime() - 30 * 86400000));
  const daily: Array<{ date: string; dateKey: string; revenueCents: number; orders: number }> = [];
  for (let cursor = new Date(chartStart); cursor <= chartEnd; cursor = new Date(cursor.getTime() + 86400000)) { const key = cursor.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); daily.push({ dateKey: key, date: cursor.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }), ...(dailyMap.get(key) ?? { revenueCents: 0, orders: 0 }) }); }
  const ratingAverage = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const feedbackAverage = (field: "deliveryRating" | "serviceRating" | "sellerRating") => orderFeedbacks.length ? orderFeedbacks.reduce((sum, feedback) => sum + feedback[field], 0) / orderFeedbacks.length : 0;
  return {
    period, generatedAt: new Date(), from, to, orders, confirmed, revenue, averageTicket: confirmed.length ? Math.round(revenue / confirmed.length) : 0,
    cancelled: orders.filter((order) => order.status === "CANCELADO").length,
    refunds: orders.filter((order) => ["REEMBOLSO_SOLICITADO", "REEMBOLSADO"].includes(order.status)).length,
    newCustomers: customers.length, customers, reviews: reviews.length, ratingAverage, questions: questions.length,
    orderFeedbacks, orderFeedbackCount: orderFeedbacks.length, deliveryRatingAverage: feedbackAverage("deliveryRating"), serviceRatingAverage: feedbackAverage("serviceRating"), sellerRatingAverage: feedbackAverage("sellerRating"),
    unansweredQuestions: questions.filter((question) => !question.answeredAt && !question.hidden).length,
    status, payment, topProducts, inventory, daily, salesDaily,
  };
}

export function reportRows(data: Awaited<ReturnType<typeof getReports>>, type: ReportType): Array<Record<string, string | number>> {
  if (type === "sales") return data.salesDaily.map((row) => ({ Data: row.date.split("-").reverse().join("/"), Pedidos: row.orders, "Faturamento (centavos)": row.revenueCents }));
  if (type === "orders") return data.orders.map((order) => ({ Pedido: order.id, Cliente: order.email, Itens: order.items.reduce((sum, item) => sum + item.qty, 0), Produtos: order.items.map((item) => `${item.productName}${item.variantName ? ` (${item.variantName})` : ""} × ${item.qty}`).join("; "), Status: order.status, Pagamento: order.mpPaymentMethod ?? "Não informado", "Total (centavos)": order.totalCents, Frete: order.shippingMethod ?? "Não informado", Rastreamento: order.trackingCode ?? "—", Cidade: order.shipCity ?? "—", UF: order.shipState ?? "—", Criado: order.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), Atualizado: order.updatedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) }));
  if (type === "products") return data.inventory.map((row) => ({ Produto: row.product, Categoria: row.category, Situação: row.active, Estoque: row.stock, "Preço (centavos)": row.priceCents }));
  if (type === "payments") return data.payment.map(([method, count]) => ({ "Meio de pagamento": method, Pedidos: count }));
  if (type === "service") return data.orderFeedbacks.length ? data.orderFeedbacks.map((feedback) => ({ Pedido: feedback.orderId, Entrega: feedback.deliveryRating, Loja: feedback.serviceRating, Vendedor: feedback.sellerRating, Comentário: feedback.comment ?? "—", Data: feedback.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) })) : [{ "Avaliações de pedido": 0, "Média entrega": "0.00", "Média loja": "0.00", "Média vendedor": "0.00" }];
  return data.customers.map((customer) => ({ Cliente: customer.name ?? "Sem nome", Email: customer.email, Pedidos: customer._count.orders, Avaliações: customer._count.reviews, Dúvidas: customer._count.questions, Cadastro: customer.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) }));
}
