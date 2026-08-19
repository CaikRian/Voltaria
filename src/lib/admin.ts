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

export async function getAdminOrders(opts?: {
  status?: string;
  q?: string;
  chat?: "all" | "open" | "waiting_staff" | "waiting_client" | "closed" | "none";
  payment?: "all" | "paid" | "pending";
  sort?: "newest" | "oldest" | "highest" | "updated";
  page?: number;
  pageSize?: number;
}) {
  const pageSize = Math.min(Math.max(opts?.pageSize ?? 10, 5), 50);
  const page = Math.max(opts?.page ?? 1, 1);
  const paidStatuses = ["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO", "ENVIADO", "ENTREGUE"];
  const where = {
    ...(opts?.status ? { status: opts.status } : {}),
    ...(opts?.q ? { OR: [{ id: { contains: opts.q } }, { email: { contains: opts.q } }, { shipName: { contains: opts.q } }] } : {}),
    ...(opts?.chat === "open" ? { messages: { some: {} }, chatClosedAt: null }
      : opts?.chat === "waiting_staff" ? { awaitingReplyFrom: "STAFF", chatClosedAt: null }
      : opts?.chat === "waiting_client" ? { awaitingReplyFrom: "CLIENTE", chatClosedAt: null }
      : opts?.chat === "closed" ? { chatClosedAt: { not: null } }
      : opts?.chat === "none" ? { messages: { none: {} } }
      : {}),
    ...(!opts?.status && opts?.payment === "paid" ? { status: { in: paidStatuses } }
      : !opts?.status && opts?.payment === "pending" ? { status: { in: ["AGUARDANDO_PAGAMENTO", "PAGAMENTO_RECUSADO"] } }
      : {}),
  };
  const orderBy = opts?.sort === "oldest" ? { createdAt: "asc" as const }
    : opts?.sort === "highest" ? { totalCents: "desc" as const }
    : opts?.sort === "updated" ? { updatedAt: "desc" as const }
    : { createdAt: "desc" as const };
  const [orders, total, waitingStaff, openChats] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true, email: true, shipName: true, shipCity: true, shipState: true,
        totalCents: true, status: true, createdAt: true, updatedAt: true,
        mpPaymentMethod: true, awaitingReplyFrom: true, chatClosedAt: true,
        _count: { select: { items: true, messages: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { text: true, senderRole: true, createdAt: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
    prisma.order.count({ where: { awaitingReplyFrom: "STAFF", chatClosedAt: null } }),
    prisma.order.count({ where: { messages: { some: {} }, chatClosedAt: null } }),
  ]);
  // Mantém compatibilidade com consumidores antigos que tratavam o retorno como lista,
  // enquanto expõe os metadados usados pela nova central paginada.
  return Object.assign(orders, {
    orders,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    waitingStaff,
    openChats,
  });
}

export async function getSellerDashboardSummary() {
  // "Pendente" = a última mensagem do chat foi do cliente e a equipe ainda não
  // respondeu (awaitingReplyFrom === "STAFF"). Antes isso checava "o pedido já
  // teve alguma mensagem de cliente" — o que deixava o card preso em "pendente"
  // pra sempre, mesmo depois da equipe responder.
  const now = new Date();
  const brasiliaParts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "numeric", day: "numeric" })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  // Brasília está em UTC-3 desde 2019. Construímos os limites em UTC para que a
  // consulta ao banco vire o dia às 00:00 de São Paulo, e não às 00:00 da Vercel.
  const startOfDay = new Date(Date.UTC(brasiliaParts.year, brasiliaParts.month - 1, brasiliaParts.day, 3));
  const startOfMonth = new Date(Date.UTC(brasiliaParts.year, brasiliaParts.month - 1, 1, 3));
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
    prisma.order.count({ where: { awaitingReplyFrom: "STAFF", chatClosedAt: null, status: { not: "CANCELADO" } } }),
    prisma.order.count({ where: { status: "REEMBOLSO_SOLICITADO" } }),
  ]);
  return { questions, chats, refunds };
}

export async function getAdminConversations(opts: {
  queue?: "open" | "waiting" | "customer" | "closed" | "all";
  q?: string;
  status?: string;
  sort?: "recent" | "oldest" | "messages" | "order";
  page?: number;
  pageSize?: number;
} = {}) {
  const queue = opts.queue ?? "open";
  const page = Math.max(opts.page ?? 1, 1);
  const pageSize = Math.min(Math.max(opts.pageSize ?? 10, 5), 30);
  // CANCELADO é sempre tratado como atendimento encerrado, inclusive em pedidos
  // antigos que ainda não possuíam chatClosedAt preenchido.
  const queueWhere = queue === "waiting"
    ? { awaitingReplyFrom: "STAFF", chatClosedAt: null, status: { not: "CANCELADO" } }
    : queue === "customer"
      ? { awaitingReplyFrom: "CLIENTE", chatClosedAt: null, status: { not: "CANCELADO" } }
      : queue === "closed"
        ? { OR: [{ chatClosedAt: { not: null } }, { status: "CANCELADO" }] }
        : queue === "open"
          ? { chatClosedAt: null, status: { not: "CANCELADO" } }
          : {};
  const where = {
    AND: [
      { messages: { some: {} } },
      queueWhere,
      ...(opts.status ? [{ status: opts.status }] : []),
      ...(opts.q ? [{ OR: [{ id: { contains: opts.q } }, { email: { contains: opts.q } }, { shipName: { contains: opts.q } }] }] : []),
    ],
  };
  const orderBy = opts.sort === "oldest" ? { updatedAt: "asc" as const }
    : opts.sort === "messages" ? { messages: { _count: "desc" as const } }
    : opts.sort === "order" ? { createdAt: "desc" as const }
    : { updatedAt: "desc" as const };
  const [conversations, total, open, waiting, customer, closed] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true, email: true, shipName: true, totalCents: true, status: true, awaitingReplyFrom: true,
        chatClosedAt: true, createdAt: true, updatedAt: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, text: true, senderRole: true, createdAt: true, user: { select: { name: true } } } },
        _count: { select: { messages: true, items: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
    prisma.order.count({ where: { messages: { some: {} }, chatClosedAt: null, status: { not: "CANCELADO" } } }),
    prisma.order.count({ where: { messages: { some: {} }, awaitingReplyFrom: "STAFF", chatClosedAt: null, status: { not: "CANCELADO" } } }),
    prisma.order.count({ where: { messages: { some: {} }, awaitingReplyFrom: "CLIENTE", chatClosedAt: null, status: { not: "CANCELADO" } } }),
    prisma.order.count({ where: { messages: { some: {} }, OR: [{ chatClosedAt: { not: null } }, { status: "CANCELADO" }] } }),
  ]);
  return { conversations, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), counts: { open, waiting, customer, closed } };
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
