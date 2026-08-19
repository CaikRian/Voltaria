import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ products: [] });

  const products = await prisma.product.findMany({
    where: {
      active: true,
      OR: [{ name: { contains: q, mode: "insensitive" } }, { brand: { contains: q, mode: "insensitive" } }, { category: { name: { contains: q, mode: "insensitive" } } }],
    },
    select: {
      id: true, name: true, slug: true, brand: true, imageUrl: true,
      priceCents: true, compareCents: true, stock: true,
      category: { select: { name: true } },
      variants: { select: { stock: true } },
    },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    take: 6,
  });

  return NextResponse.json({
    products: products.map(({ variants, ...product }) => ({
      ...product,
      inStock: product.stock > 0 || variants.some((variant) => variant.stock > 0),
    })),
  }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
}
