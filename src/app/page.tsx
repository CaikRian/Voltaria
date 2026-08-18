import Link from "next/link";
import { getFeaturedProducts, getCategories } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ButtonLink } from "@/components/ui/Button";

// ISR: revalida a home a cada 60s — rápida como estática, mas atualiza sozinha.
export const revalidate = 60;

export default async function HomePage() {
  const [featured, categories] = await Promise.all([
    getFeaturedProducts(8),
    getCategories(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-gradient-to-br from-brand-soft to-mist">
        <div className="container-x grid gap-8 py-14 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              Frete grátis acima de R$ 299
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Tecnologia que{" "}
              <span className="text-brand">funciona</span> pra você
            </h1>
            <p className="mt-4 max-w-md text-lg text-ink-soft">
              Do smartphone à cozinha inteligente. Os melhores eletrônicos e produtos gerais, com
              preço justo e entrega rápida.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/produtos" size="lg">
                Ver todos os produtos
              </ButtonLink>
              <ButtonLink href="/produtos?categoria=smartphones" variant="ghost" size="lg">
                Smartphones
              </ButtonLink>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {featured.slice(0, 3).map((p, idx) => (
              <Link
                key={p.id}
                href={`/produtos/${p.slug}`}
                className={`relative overflow-hidden rounded-xl2 border border-line bg-paper shadow-card ${
                  idx === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="container-x py-12">
        <h2 className="mb-6 font-display text-2xl font-semibold">Categorias</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/produtos?categoria=${c.slug}`}
              className="flex flex-col items-center gap-2 rounded-xl2 border border-line bg-paper p-5 text-center shadow-card transition-colors hover:border-brand hover:bg-brand-soft"
            >
              <span className="text-3xl">{c.icon}</span>
              <span className="text-sm font-medium">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Destaques */}
      <section className="container-x pb-4">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-semibold">Em destaque</h2>
          <Link href="/produtos" className="text-sm font-medium text-brand hover:underline">
            Ver tudo →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Selos de confiança */}
      <section className="container-x py-12">
        <div className="grid grid-cols-2 gap-4 rounded-xl2 border border-line bg-paper p-6 shadow-card md:grid-cols-4">
          {[
            { t: "Compra segura", d: "Pagamento criptografado" },
            { t: "PIX e cartão", d: "Até 12x sem juros" },
            { t: "Entrega rápida", d: "Para todo o Brasil" },
            { t: "Troca fácil", d: "7 dias de garantia" },
          ].map((s) => (
            <div key={s.t} className="text-center">
              <p className="font-display font-semibold">{s.t}</p>
              <p className="text-sm text-ink-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
