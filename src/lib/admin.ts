import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/permissions";

// Consultas específicas do painel (incluem produtos inativos, que a loja não mostra).

export async function getAdminProducts(q?: string) {
  return prisma.product.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { brand: { contains: q } }] }
      : {},
    include: { category: true, variants: { select: { stock: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });
}

export async function getCategoriesForSelect() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getAdminOrders(opts?: { status?: string; q?: string }) {
  return prisma.order.findMany({
    where: {
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.q
        ? { OR: [{ id: { contains: opts.q } }, { email: { contains: opts.q } }] }
        : {}),
    },
    include: { _count: { select: { items: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSellerDashboardSummary() {
  // "Pendente" = a última mensagem do chat foi do cliente e a equipe ainda não
  // respondeu (awaitingReplyFrom === "STAFF"). Antes isso checava "o pedido já
  // teve alguma mensagem de cliente" — o que deixava o card preso em "pendente"
  // pra sempre, mesmo depois da equipe responder.
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidStatuses = ["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO", "ENVIADO", "ENTREGUE"];

  const [awaitingApproval, refundRequests, pendingShipment, chatPending, unansweredQuestions, pendingMessages, salesToday, salesMonth, recentOrders, products] = await Promise.all([
    prisma.order.count({ where: { status: "AGUARDANDO_PAGAMENTO" } }),
    prisma.order.count({ where: { status: "REEMBOLSO_SOLICITADO" } }),
    prisma.order.count({ where: { status: { in: ["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO"] } } }),
    prisma.order.count({ where: { awaitingReplyFrom: "STAFF", chatClosedAt: null } }),
    prisma.question.count({ where: { answeredAt: null, hidden: false } }),
    prisma.order.findMany({
      where: { awaitingReplyFrom: "STAFF", chatClosedAt: null },
      select: {
        id: true,
        email: true,
        status: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { text: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.order.aggregate({ where: { status: { in: paidStatuses }, createdAt: { gte: startOfDay } }, _count: true, _sum: { totalCents: true } }),
    prisma.order.aggregate({ where: { status: { in: paidStatuses }, createdAt: { gte: startOfMonth } }, _count: true, _sum: { totalCents: true } }),
    prisma.order.findMany({
      select: { id: true, email: true, status: true, totalCents: true, createdAt: true, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.product.findMany({
      select: { id: true, name: true, imageUrl: true, active: true, stock: true, variants: { select: { stock: true } } },
    }),
  ]);

  const inventory = products.map((product) => ({
    id: product.id,
    name: product.name,
    imageUrl: product.imageUrl,
    active: product.active,
    stock: product.variants.length ? product.variants.reduce((total, variant) => total + variant.stock, 0) : product.stock,
  }));
  const lowStockProducts = inventory.filter((product) => product.active && product.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 5);

  return {
    awaitingApproval,
    refundRequests,
    pendingShipment,
    chatPending,
    unansweredQuestions,
    pendingMessages,
    salesToday: { count: salesToday._count, cents: salesToday._sum.totalCents ?? 0 },
    salesMonth: { count: salesMonth._count, cents: salesMonth._sum.totalCents ?? 0 },
    activeProducts: inventory.filter((product) => product.active).length,
    lowStockCount: inventory.filter((product) => product.active && product.stock <= 5).length,
    lowStockProducts,
    recentOrders,
  };
}

export async function getPanelNavigationCounts() {
  const [questions, chats, refunds] = await Promise.all([
    prisma.question.count({ where: { answeredAt: null, hidden: false } }),
    prisma.order.count({ where: { awaitingReplyFrom: "STAFF", chatClosedAt: null } }),
    prisma.order.count({ where: { status: "REEMBOLSO_SOLICITADO" } }),
  ]);
  return { questions, chats, refunds };
}

export async function getAdminConversations(filter: "open" | "waiting" | "closed" | "all" = "open") {
  return prisma.order.findMany({
    where: {
      messages: { some: {} },
      ...(filter === "waiting" ? { awaitingReplyFrom: "STAFF", chatClosedAt: null } : {}),
      ...(filter === "closed" ? { chatClosedAt: { not: null } } : {}),
      ...(filter === "open" ? { chatClosedAt: null } : {}),
    },
    select: {
      id: true, email: true, status: true, awaitingReplyFrom: true, chatClosedAt: true, updatedAt: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, text: true, senderRole: true, createdAt: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAdminOrder(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
}

export async function getAdminReviews() {
  return prisma.review.findMany({
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminQuestions() {
  const questions = await prisma.question.findMany({
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  // Não respondidas primeiro; sort é estável então createdAt desc se mantém dentro
  // de cada grupo. Evito "nulls first" do Prisma (não é portável SQLite→Postgres).
  return questions.sort((a, b) => Number(!!a.answeredAt) - Number(!!b.answeredAt));
}

// Sem busca: só a equipe (VENDEDOR/GERENTE/ADMIN) — bate com "Gerenciar equipe" e
// evita despejar a base inteira de clientes numa página sem paginação. Com busca
// (q): abre pra todo mundo, inclusive CLIENTE — é como se promove um cliente a
// vendedor.
export async function getAdminUsers(q?: string) {
  return prisma.user.findMany({
    where: q
      ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] }
      : { role: { in: STAFF_ROLES } },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}
