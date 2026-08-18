import { prisma } from "@/lib/prisma";

// Camada de acesso a dados. Toda leitura de catálogo passa por aqui —
// assim, se um dia trocarmos Prisma por outra fonte, muda só este arquivo.

export async function getFeaturedProducts(limit = 8) {
  return prisma.product.findMany({
    where: { active: true, featured: true },
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function getProducts(opts: {
  q?: string;
  categorySlug?: string;
  sort?: "recent" | "price_asc" | "price_desc";
}) {
  const { q, categorySlug, sort = "recent" } = opts;

  const orderBy =
    sort === "price_asc"
      ? { priceCents: "asc" as const }
      : sort === "price_desc"
        ? { priceCents: "desc" as const }
        : { createdAt: "desc" as const };

  return prisma.product.findMany({
    where: {
      active: true,
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
              { brand: { contains: q } },
            ],
          }
        : {}),
    },
    include: { category: true },
    orderBy,
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: { category: true, variants: true },
  });
}

// Busca produtos por id para recomputar preço/estoque no servidor no checkout —
// nunca confiar no unitCents que vem do carrinho (client-side). Só retorna produtos
// ativos: se um item saiu de linha entre "adicionar ao carrinho" e o checkout, ele
// simplesmente não aparece aqui e o chamador trata como indisponível.
export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return prisma.product.findMany({
    where: { id: { in: ids }, active: true },
    include: { variants: true },
  });
}

export async function getRelatedProducts(categoryId: string, excludeId: string, limit = 4) {
  return prisma.product.findMany({
    where: { active: true, categoryId, NOT: { id: excludeId } },
    include: { category: true },
    take: limit,
  });
}
