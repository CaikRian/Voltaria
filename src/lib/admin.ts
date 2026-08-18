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
  const [awaitingApproval, refundRequests, pendingShipment, chatPending, pendingMessages] = await Promise.all([
    prisma.order.count({ where: { status: "AGUARDANDO_PAGAMENTO" } }),
    prisma.order.count({ where: { status: "REEMBOLSO_SOLICITADO" } }),
    prisma.order.count({ where: { status: { in: ["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO"] } } }),
    prisma.order.count({ where: { messages: { some: { senderRole: "CLIENTE" } } } }),
    prisma.order.findMany({
      where: { messages: { some: { senderRole: "CLIENTE" } } },
      select: {
        id: true,
        email: true,
        status: true,
        updatedAt: true,
        messages: {
          where: { senderRole: "CLIENTE" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { text: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ]);

  return {
    awaitingApproval,
    refundRequests,
    pendingShipment,
    chatPending,
    pendingMessages,
  };
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
