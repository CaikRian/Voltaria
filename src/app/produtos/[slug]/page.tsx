import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";
import { getCurrentUser } from "@/lib/auth-helpers";
import { Price } from "@/components/ui/Price";
import { AddToCart } from "@/components/AddToCart";
import { ProductCard } from "@/components/ProductCard";
import { ShippingCalculator } from "@/components/ShippingCalculator";
import { formatBRL } from "@/lib/format";
import { ReviewsSection } from "./ReviewsSection";
import { QuestionsSection } from "./QuestionsSection";

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

  // Dados estruturados (Schema.org) para Rich Snippets no Google.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.imageUrl,
    brand: { "@type": "Brand", name: product.brand ?? "Voltaria" },
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
    <div className="container-x py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Trilha de navegação" className="mb-6 flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand">Início</Link>
        <span>/</span>
        <Link href={`/produtos?categoria=${product.category.slug}`} className="hover:text-brand">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Imagem */}
        <div className="relative aspect-square overflow-hidden rounded-xl2 border border-line bg-paper">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>

        {/* Informações */}
        <div>
          {product.brand && (
            <span className="text-sm font-medium uppercase tracking-wide text-ink-muted">
              {product.brand}
            </span>
          )}
          <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">{product.name}</h1>

          <div className="mt-4">
            <Price
              priceCents={product.priceCents}
              compareCents={product.compareCents}
              size="lg"
              showInstallments
            />
            <p className="mt-1 text-sm text-ok">
              {formatBRL(Math.round(product.priceCents * 0.95))} à vista no PIX (5% de desconto)
            </p>
          </div>

          <p className="mt-6 leading-relaxed text-ink-soft">{product.description}</p>

          <div className="mt-8">
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

          <div className="mt-8 grid grid-cols-2 gap-3 rounded-xl2 border border-line bg-paper p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="font-medium">Entrega</p>
              <p className="text-ink-muted">Todo o Brasil</p>
            </div>
            <div>
              <p className="font-medium">Garantia</p>
              <p className="text-ink-muted">7 dias de troca</p>
            </div>
            <div>
              <p className="font-medium">Pagamento</p>
              <p className="text-ink-muted">PIX, cartão, boleto</p>
            </div>
          </div>

          <div className="mt-4">
            <ShippingCalculator subtotalCents={product.priceCents} />
          </div>
        </div>
      </div>

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
