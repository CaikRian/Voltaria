import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://voltaria.com.br";
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { slug: true, createdAt: true },
  });

  return [
    { url: base, priority: 1 },
    { url: `${base}/produtos`, priority: 0.9 },
    ...products.map((p) => ({
      url: `${base}/produtos/${p.slug}`,
      lastModified: p.createdAt,
      priority: 0.7,
    })),
  ];
}
