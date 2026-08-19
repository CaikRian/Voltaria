import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/permissions";
import { maskCpf } from "@/lib/format";

// Consultas específicas do painel (incluem produtos inativos, que a loja não mostra).

export async function getAdminProducts(opts?: string | {
  q?: string;
  category?: string;
  visibility?: "all" | "active" | "inactive" | "featured";
  stock?: "all" | "out" | "low" | "available";
  sort?: "newest" | "oldest" | "name" | "price_high" | "price_low" | "stock";
  page?: number;
  pageSize?: number;
}) {
  const options = typeof opts === "string" ? { q: opts } : (opts ?? {});
  const page = Math.max(options.page ?? 1, 1);
  const pageSize = Math.min(Math.max(options.pageSize ?? 10, 5), 30);
  const stockFilter = options.stock ?? "all";
  const stockWhere = stockFilter === "out"
    ? { stock: 0, variants: { none: { stock: { gt: 0 } } } }
    : stockFilter === "available"
      ? { OR: [{ stock: { gt: 5 } }, { variants: { some: { stock: { gt: 5 } } } }] }
      : stockFilter === "low"
        ? { OR: [{ stock: { gt: 0, lte: 5 } }, { variants: { some: { stock: { gt: 0, lte: 5 } } } }] }
        : {};
  const where = {
    AND: [
      ...(options.q ? [{ OR: [{ name: { contains: options.q } }, { brand: { contains: options.q } }, { variants: { some: { sku: { contains: options.q } } } }] }] : []),
      ...(options.category ? [{ categoryId: options.category }] : []),
      ...(options.visibility === "active" ? [{ active: true }]
        : options.visibility === "inactive" ? [{ active: false }]
        : options.visibility === "featured" ? [{ featured: true }]
        : []),
      stockWhere,
    ],
  };
  const orderBy = options.sort === "oldest" ? { createdAt: "asc" as const }
    : options.sort === "name" ? { name: "asc" as const }
    : options.sort === "price_high" ? { priceCents: "desc" as const }
    : options.sort === "price_low" ? { priceCents: "asc" as const }
    : options.sort === "stock" ? { stock: "asc" as const }
    : { createdAt: "desc" as const };
  const [products, total, active, inactive, featured, categories, inventory] = await Promise.all([
    prisma.product.findMany({ where, include: { category: true, variants: { select: { name: true, sku: true, stock: true, priceCents: true } }, _count: { select: { reviews: true, questions: true } } }, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.product.count({ where }),
    prisma.product.count({ where: { active: true } }),
    prisma.product.count({ where: { active: false } }),
    prisma.product.count({ where: { featured: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { products: true } } } }),
    prisma.product.findMany({ select: { stock: true, variants: { select: { stock: true } } } }),
  ]);
  const lowStock = inventory.filter((item) => (item.variants.length ? item.variants.reduce((sum, variant) => sum + variant.stock, 0) : item.stock) <= 5).length;
  return Object.assign(products, { products, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), stats: { active, inactive, featured, lowStock }, categories });
}

export async function getAdminProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { variants: true, auditEvents: { orderBy: { createdAt: "desc" } } },
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
  const [questions, chats, refunds, chatbot] = await Promise.all([
    prisma.question.count({ where: { answeredAt: null, hidden: false } }),
    prisma.order.count({ where: { awaitingReplyFrom: "STAFF", chatClosedAt: null, status: { not: "CANCELADO" } } }),
    prisma.order.count({ where: { status: "REEMBOLSO_SOLICITADO" } }),
    prisma.chatSession.count({ where: { awaitingReplyFrom: "STAFF", chatClosedAt: null } }),
  ]);
  return { questions, chats, refunds, chatbot };
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

// --- Chat-bot (widget flutuante) ---
export async function getAdminChatSessions(opts: {
  queue?: "waiting" | "open" | "closed" | "all";
  q?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const queue = opts.queue ?? "waiting";
  const page = Math.max(opts.page ?? 1, 1);
  const pageSize = Math.min(Math.max(opts.pageSize ?? 10, 5), 30);
  const queueWhere = queue === "waiting"
    ? { awaitingReplyFrom: "STAFF", chatClosedAt: null }
    : queue === "open"
      ? { chatClosedAt: null }
      : queue === "closed"
        ? { chatClosedAt: { not: null } }
        : {};
  const where = {
    AND: [
      queueWhere,
      ...(opts.q ? [{ OR: [{ name: { contains: opts.q } }, { email: { contains: opts.q } }, { orderRef: { contains: opts.q } }] }] : []),
    ],
  };
  const [rawSessions, total, waiting, open, closed] = await Promise.all([
    prisma.chatSession.findMany({
      where,
      select: {
        id: true, name: true, email: true, reason: true, orderRef: true,
        awaitingReplyFrom: true, chatWaitingSince: true, chatClosedAt: true, createdAt: true, updatedAt: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { text: true, senderRole: true, createdAt: true } },
        _count: { select: { messages: true } },
      },
      // Fila = ordem de chegada (quem espera há mais tempo aparece primeiro).
      // Fora da fila, ordena por atividade recente — não faz sentido "posição" ali.
      orderBy: queue === "waiting" ? { chatWaitingSince: "asc" } : { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.chatSession.count({ where }),
    prisma.chatSession.count({ where: { awaitingReplyFrom: "STAFF", chatClosedAt: null } }),
    prisma.chatSession.count({ where: { chatClosedAt: null } }),
    prisma.chatSession.count({ where: { chatClosedAt: { not: null } } }),
  ]);
  // Posição na página + offset da paginação — já veio ordenado por chegada.
  const sessions = rawSessions.map((session, index) => ({
    ...session,
    queuePosition: queue === "waiting" ? (page - 1) * pageSize + index + 1 : null,
  }));
  return { sessions, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)), counts: { waiting, open, closed } };
}

export async function getAdminChatSession(id: string) {
  const session = await prisma.chatSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) return null;

  const queuePosition =
    session.awaitingReplyFrom === "STAFF" && session.chatWaitingSince && !session.chatClosedAt
      ? await prisma.chatSession.count({
          where: { awaitingReplyFrom: "STAFF", chatClosedAt: null, chatWaitingSince: { lte: session.chatWaitingSince } },
        })
      : null;

  return { ...session, queuePosition };
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

// Dados mínimos pro comprovante interno do painel — só o necessário pra
// conferência de segurança (não reaproveita getAdminOrder pra não carregar
// chat/timeline à toa nem crescer o shape usado pela tela de pedido).
export async function getAdminOrderReceipt(id: string) {
  return prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      shipName: true,
      totalCents: true,
      mpPaymentId: true,
      items: { select: { id: true, productName: true, variantName: true, unitCents: true, qty: true } },
      user: { select: { cpf: true } },
    },
  });
}

export async function getAdminReviews(opts?: {
  q?: string;
  rating?: number; // 1-5
  visibility?: "all" | "visible" | "hidden";
  sort?: "recent" | "oldest" | "highest" | "lowest";
  page?: number;
  pageSize?: number;
}) {
  const pageSize = Math.min(Math.max(opts?.pageSize ?? 10, 5), 50);
  const page = Math.max(opts?.page ?? 1, 1);
  const where = {
    ...(opts?.rating ? { rating: opts.rating } : {}),
    ...(opts?.visibility === "hidden" ? { hidden: true } : opts?.visibility === "visible" ? { hidden: false } : {}),
    ...(opts?.q
      ? {
          OR: [
            { comment: { contains: opts.q } },
            { product: { name: { contains: opts.q } } },
            { user: { name: { contains: opts.q } } },
            { user: { email: { contains: opts.q } } },
          ],
        }
      : {}),
  };
  const orderBy =
    opts?.sort === "oldest" ? { createdAt: "asc" as const }
      : opts?.sort === "highest" ? { rating: "desc" as const }
      : opts?.sort === "lowest" ? { rating: "asc" as const }
      : { createdAt: "desc" as const };

  const [reviews, total, allStats, hiddenCount] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
    prisma.review.count({ where: { hidden: true } }),
  ]);

  return Object.assign(reviews, {
    reviews,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    avgRating: allStats._avg.rating ?? 0,
    totalAll: allStats._count,
    hiddenCount,
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

// --- Clientes (CRM do painel) ---
// Nunca selecionamos passwordHash/dateOfBirth/gender aqui — minimização de dado (LGPD),
// esses campos não têm função operacional pro vendedor. cpf é tratado à parte (mascarado).

const PAID_ORDER_STATUSES = ["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO", "ENVIADO", "ENTREGUE"];

export async function getAdminCustomers(opts?: {
  q?: string;
  sort?: "recent" | "orders" | "lastAccess";
  page?: number;
  pageSize?: number;
}) {
  const pageSize = Math.min(Math.max(opts?.pageSize ?? 12, 6), 50);
  const page = Math.max(opts?.page ?? 1, 1);
  const where = {
    role: "CLIENTE" as const,
    ...(opts?.q
      ? { OR: [{ name: { contains: opts.q } }, { email: { contains: opts.q } }, { phone: { contains: opts.q.replace(/\D/g, "") } }] }
      : {}),
  };
  const orderBy =
    opts?.sort === "orders" ? { orders: { _count: "desc" as const } }
      : opts?.sort === "lastAccess" ? { lastLoginAt: "desc" as const }
      : { createdAt: "desc" as const };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true, image: true,
        createdAt: true, lastLoginAt: true,
        _count: { select: { orders: true, reviews: true, questions: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  // Total gasto só da página atual — evita agregar a base inteira a cada busca.
  const spendByCustomer = await prisma.order.groupBy({
    by: ["userId"],
    where: { userId: { in: customers.map((c) => c.id) }, status: { in: PAID_ORDER_STATUSES } },
    _sum: { totalCents: true },
  });
  const spendMap = new Map(spendByCustomer.map((s) => [s.userId, s._sum.totalCents ?? 0]));

  const items = customers.map((c) => ({ ...c, totalSpentCents: spendMap.get(c.id) ?? 0 }));

  return Object.assign(items, {
    customers: items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function getAdminCustomer(id: string) {
  const customer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, image: true, cpf: true,
      createdAt: true, emailVerified: true, lastLoginAt: true, role: true,
      allowEmailUpdates: true, allowWhatsappUpdates: true, referralSource: true,
      addresses: { orderBy: { isDefault: "desc" } },
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          statusEvents: { orderBy: { createdAt: "asc" } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { product: { select: { name: true, slug: true, imageUrl: true } } },
      },
      questions: {
        orderBy: { createdAt: "desc" },
        include: { product: { select: { name: true, slug: true } } },
      },
    },
  });

  // null também se o id for de um membro da equipe — essa tela é só pra CLIENTE.
  if (!customer || customer.role !== "CLIENTE") return null;

  const paidOrders = customer.orders.filter((o) => PAID_ORDER_STATUSES.includes(o.status));
  const { cpf, ...rest } = customer;

  return {
    ...rest,
    cpfMasked: cpf ? maskCpf(cpf) : null,
    totalOrders: customer.orders.length,
    totalSpentCents: paidOrders.reduce((sum, o) => sum + o.totalCents, 0),
    lastOrderAt: customer.orders[0]?.createdAt ?? null,
  };
}
