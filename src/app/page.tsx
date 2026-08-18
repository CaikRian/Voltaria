import Link from "next/link";
import { getFeaturedProducts, getCategories, getTrendingProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { ButtonLink } from "@/components/ui/Button";

// ISR: revalida a home a cada 60s — rápida como estática, mas atualiza sozinha.
export const revalidate = 60;

export default async function HomePage() {
  const [featured, categories, trending] = await Promise.all([
    getFeaturedProducts(8),
    getCategories(),
    getTrendingProducts(4),
  ]);
  const hotProducts = trending.length > 0 ? trending : featured.slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-line bg-ink text-white">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand/30 blur-3xl motion-safe:animate-pulse" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-deal/20 blur-3xl motion-safe:animate-pulse" />
        <div className="container-x relative grid gap-10 py-14 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-ok" /> Frete grátis acima de R$ 299
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
              Produtos que facilitam sua rotina e{" "}<span className="text-[#8DA7FF]">cabem no seu bolso.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
              Tecnologia e utilidades escolhidas para você comprar com confiança, pagar com segurança e receber onde estiver.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/produtos" size="lg" className="shadow-pop">Explorar ofertas</ButtonLink>
              <ButtonLink href="#em-alta" variant="ghost" size="lg" className="border-white/25 text-white hover:bg-white/10">Ver produtos em alta</ButtonLink>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/65">
              <span>✓ 5% de desconto no PIX</span><span>✓ Até 12x sem juros</span><span>✓ Mercado Pago</span>
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
            {featured.slice(0, 3).map((product, index) => (
              <Link key={product.id} href={`/produtos/${product.slug}`} className={`group relative overflow-hidden rounded-xl2 border border-white/15 bg-white shadow-pop ${index === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-10">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{product.name}</p>
                </div>
              </Link>
            ))}
            <span className="absolute -right-3 -top-3 rounded-full bg-deal px-3 py-2 text-xs font-bold text-white shadow-pop motion-safe:animate-bounce">Ofertas</span>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="container-x grid grid-cols-2 divide-x divide-line py-4 md:grid-cols-4">
          {[{ t: "Compra segura", d: "Pagamento protegido" }, { t: "PIX e cartão", d: "Condições flexíveis" }, { t: "Entrega nacional", d: "Para todo o Brasil" }, { t: "Troca fácil", d: "Até 7 dias" }].map((item) => (
            <div key={item.t} className="px-3 py-2 text-center"><p className="text-sm font-semibold">{item.t}</p><p className="mt-0.5 text-xs text-ink-muted">{item.d}</p></div>
          ))}
        </div>
      </section>

      {/* Categorias */}
      <section className="container-x py-12 sm:py-14">
        <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Encontre mais rápido</p><h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">O que você procura hoje?</h2></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/produtos?categoria=${c.slug}`}
              className="group flex flex-col items-center gap-3 rounded-xl2 border border-line bg-paper p-5 text-center shadow-card transition-all hover:-translate-y-1 hover:border-brand hover:bg-brand-soft hover:shadow-pop"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mist text-3xl transition-transform group-hover:scale-110 group-hover:bg-paper">{c.icon}</span>
              <span className="text-sm font-medium">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Em alta: ranking por vendas confirmadas; fallback honesto para destaques. */}
      {hotProducts.length > 0 && (
        <section id="em-alta" className="border-y border-line bg-gradient-to-b from-brand-soft/70 to-mist py-12 sm:py-16">
          <div className="container-x">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><span className="inline-flex rounded-full bg-deal px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Em alta</span><h2 className="mt-3 font-display text-3xl font-semibold">{trending.length > 0 ? "Os mais comprados" : "Destaques da vitrine"}</h2><p className="mt-1 text-sm text-ink-muted">{trending.length > 0 ? "Produtos que mais conquistaram clientes em compras confirmadas." : "Uma seleção especial para você começar a explorar."}</p></div>
              <Link href="/produtos" className="text-sm font-semibold text-brand hover:underline">Ver catálogo completo →</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {hotProducts.map((product, index) => (
                <div key={product.id} className="relative">
                  {trending.length > 0 && <span className="absolute -left-2 -top-2 z-20 grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-bold text-white shadow-pop">{index + 1}º</span>}
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Destaques */}
      <section className="container-x py-12 sm:py-16">
        <div className="mb-6 flex items-end justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Escolhas da Voltaria</p><h2 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Ofertas para aproveitar</h2></div>
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

      <section className="container-x pb-14">
        <div className="relative overflow-hidden rounded-xl2 bg-ink px-6 py-10 text-white shadow-pop sm:px-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div><p className="text-sm font-semibold text-[#AFC0FF]">Sua próxima descoberta está aqui</p><h2 className="mt-2 max-w-xl font-display text-3xl font-semibold">Escolha com calma. Compre com confiança.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Compare produtos, calcule o frete e finalize com a segurança do Mercado Pago.</p></div>
            <ButtonLink href="/produtos" size="lg" className="shrink-0">Ver todos os produtos</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
