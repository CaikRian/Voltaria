import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Price } from "@/components/ui/Price";
import { AddToCart } from "@/components/AddToCart";
import { ProductCard } from "@/components/ProductCard";
import { RealShippingCalculator } from "@/components/RealShippingCalculator";
import { discountPercent, formatBRL } from "@/lib/format";
import { ReviewsSection } from "./ReviewsSection";
import { QuestionsSection } from "./QuestionsSection";
import { ProductImageGallery } from "./ProductImageGallery";

type Params = Promise<{ slug: string }>;

// Metadados dinâmicos por produto — essencial para SEO e compartilhamento.
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };

  return {
    title: product.name,
    description: product.description.slice(0, 155),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 155),
      images: [{ url: product.imageUrl }],
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, user] = await Promise.all([
    getRelatedProducts(product.categoryId, product.id),
    getCurrentUser(),
  ]);
  const discount = discountPercent(product.priceCents, product.compareCents);
  const hasStock = product.stock > 0 || product.variants.some((variant) => variant.stock > 0);
  const gallery = (() => { try { const value = JSON.parse(product.gallery ?? "[]"); return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; } catch { return []; } })();
  const productImages = [product.imageUrl, ...gallery];

  // Dados estruturados (Schema.org) para Rich Snippets no Google.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: productImages,
    brand: { "@type": "Brand", name: product.brand ?? "Heca - Store" },
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: (product.priceCents / 100).toFixed(2),
      availability:
        product.stock > 0 || product.variants.some((v) => v.stock > 0)
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container-x py-6 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Trilha de navegação" className="mb-5 flex min-w-0 items-center gap-2 overflow-hidden text-xs text-ink-muted sm:text-sm">
        <Link href="/" className="hover:text-brand">Início</Link>
        <span>/</span>
        <Link href={`/produtos?categoria=${product.category.slug}`} className="hover:text-brand">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="truncate text-ink">{product.name}</span>
      </nav>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] lg:gap-10">
        {/* Imagem */}
        <div className="lg:sticky lg:top-24">
          <ProductImageGallery name={product.name} images={productImages} discount={discount ?? 0} hasStock={hasStock} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-ink-soft">
            <div className="rounded-xl border border-line bg-paper px-2 py-3"><span className="block font-semibold text-ink">Compra segura</span>Ambiente protegido</div>
            <div className="rounded-xl border border-line bg-paper px-2 py-3"><span className="block font-semibold text-ink">Todo o Brasil</span>Consulte seu frete</div>
            <div className="rounded-xl border border-line bg-paper px-2 py-3"><span className="block font-semibold text-ink">7 dias</span>Para troca</div>
          </div>
        </div>

        {/* Informações */}
        <div className="rounded-xl2 border border-line bg-paper p-5 shadow-card sm:p-7">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            {product.brand && <span>{product.brand}</span>}
            {product.brand && <span>·</span>}
            <Link href={`/produtos?categoria=${product.category.slug}`} className="hover:text-brand">{product.category.name}</Link>
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-3 line-clamp-2 leading-relaxed text-ink-soft">{product.description}</p>

          <div className="my-6 border-y border-line py-5">
            {product.compareCents && discount ? <p className="mb-1 text-xs text-ink-muted">De {formatBRL(product.compareCents)} por</p> : null}
            <Price
              priceCents={product.priceCents}
              compareCents={product.compareCents}
              size="lg"
              showInstallments
            />
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 font-bold">✓</span>
              <span><strong>{formatBRL(Math.round(product.priceCents * 0.95))}</strong> à vista no PIX — economize 5%</span>
            </div>
          </div>

          <div>
            <AddToCart
              productId={product.id}
              slug={product.slug}
              name={product.name}
              imageUrl={product.imageUrl}
              basePriceCents={product.priceCents}
              stock={product.stock}
              variants={product.variants}
            />
          </div>

          <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-mist px-3 py-2.5"><span className="font-medium">Pagamento protegido</span><p className="text-xs text-ink-muted">Processado pelo Mercado Pago</p></div>
            <div className="rounded-xl bg-mist px-3 py-2.5"><span className="font-medium">Formas de pagamento</span><p className="text-xs text-ink-muted">PIX, cartão e boleto</p></div>
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <RealShippingCalculator items={[{ productId: product.id, qty: 1 }]} />
          </div>
        </div>
      </div>

      <section className="mt-10 rounded-xl2 border border-line bg-paper p-6 shadow-card sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-brand">Conheça o produto</p><h2 className="mt-2 font-display text-2xl font-semibold">Detalhes que ajudam na sua escolha</h2></div>
          <p className="whitespace-pre-line leading-7 text-ink-soft">{product.description}</p>
        </div>
      </section>

      <ReviewsSection productId={product.id} productSlug={product.slug} user={user} />
      <QuestionsSection productId={product.id} productSlug={product.slug} user={user} />

      {/* Relacionados */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-semibold">Você também pode gostar</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
