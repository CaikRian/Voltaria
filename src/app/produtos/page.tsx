import Link from "next/link";
import { getProducts, getCategories } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Produtos" };

type SearchParams = Promise<{ q?: string; categoria?: string; ordenar?: string }>;

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, categoria, ordenar } = await searchParams;

  const [products, categories] = await Promise.all([
    getProducts({
      q,
      categorySlug: categoria,
      sort: (ordenar as "recent" | "price_asc" | "price_desc") ?? "recent",
    }),
    getCategories(),
  ]);

  const activeCat = categories.find((c) => c.slug === categoria);
  const title = q
    ? `Resultados para "${q}"`
    : activeCat
      ? activeCat.name
      : "Todos os produtos";

  return (
    <div className="container-x py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-ink-muted">
            {products.length} {products.length === 1 ? "produto" : "produtos"}
          </p>
        </div>

        {/* Ordenação (links preservam a busca via query string) */}
        <div className="flex gap-2 text-sm">
          {[
            { label: "Recentes", value: "recent" },
            { label: "Menor preço", value: "price_asc" },
            { label: "Maior preço", value: "price_desc" },
          ].map((o) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (categoria) params.set("categoria", categoria);
            params.set("ordenar", o.value);
            const active = (ordenar ?? "recent") === o.value;
            return (
              <Link
                key={o.value}
                href={`/produtos?${params.toString()}`}
                className={`rounded-lg border px-3 py-1.5 ${
                  active ? "border-brand bg-brand-soft text-brand" : "border-line hover:bg-mist"
                }`}
              >
                {o.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Filtro de categorias */}
        <aside className="hidden lg:block">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Categorias
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            <li>
              <Link
                href="/produtos"
                className={`block rounded-lg px-3 py-2 ${
                  !categoria ? "bg-brand-soft font-medium text-brand" : "hover:bg-mist"
                }`}
              >
                Todas
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/produtos?categoria=${c.slug}`}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                    categoria === c.slug
                      ? "bg-brand-soft font-medium text-brand"
                      : "hover:bg-mist"
                  }`}
                >
                  <span>{c.icon}</span> {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Grade */}
        {products.length === 0 ? (
          <div className="grid place-items-center rounded-xl2 border border-dashed border-line py-20 text-center">
            <div>
              <p className="font-medium">Nenhum produto encontrado</p>
              <p className="mt-1 text-sm text-ink-muted">Tente outra busca ou categoria.</p>
              <Link href="/produtos" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
                Ver todos os produtos
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
