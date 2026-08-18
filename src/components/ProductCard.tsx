import Image from "next/image";
import Link from "next/link";
import { Price } from "@/components/ui/Price";
import { discountPercent } from "@/lib/format";

type Product = {
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string;
  priceCents: number;
  compareCents: number | null;
  category: { name: string };
};

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product.priceCents, product.compareCents);

  return (
    <Link
      href={`/produtos/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl2 border border-line bg-paper shadow-card transition-shadow hover:shadow-pop"
    >
      <div className="relative aspect-square overflow-hidden bg-mist">
        {off ? (
          <span className="absolute left-3 top-3 z-10 rounded-lg bg-deal px-2 py-1 text-xs font-semibold text-white">
            -{off}%
          </span>
        ) : null}
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {product.brand ?? product.category.name}
        </span>
        <h3 className="line-clamp-2 text-sm font-medium text-ink">{product.name}</h3>
        <div className="mt-auto pt-2">
          <Price priceCents={product.priceCents} compareCents={product.compareCents} size="sm" />
        </div>
      </div>
    </Link>
  );
}
