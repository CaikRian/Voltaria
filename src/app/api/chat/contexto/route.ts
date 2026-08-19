import { NextResponse } from "next/server";
import { getCategories, getFeaturedProducts } from "@/lib/products";

// Público, leve — alimenta os sub-fluxos "Produtos"/"Promoções" da Bia (o bot).
// Buscado 1x, sob demanda (quando a pessoa clica no botão), não no carregamento da página.
export async function GET() {
  const [categories, featured] = await Promise.all([getCategories(), getFeaturedProducts(3)]);

  return NextResponse.json(
    {
      categories: categories.map((c) => ({ name: c.name, slug: c.slug, icon: c.icon })),
      featured: featured.map((p) => ({
        name: p.name,
        slug: p.slug,
        priceCents: p.priceCents,
        compareCents: p.compareCents,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=120" } }
  );
}
