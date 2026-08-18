import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminProduct, getCategoriesForSelect } from "@/lib/admin";
import { requireCapability } from "@/lib/auth-helpers";
import { can } from "@/lib/permissions";
import { updateProduct } from "@/lib/actions/products";
import { ProductForm, type ProductInitial } from "../ProductForm";

export const metadata: Metadata = { title: "Editar produto · Painel" };

type Params = Promise<{ id: string }>;

// Centavos → string em reais (ex.: 329900 → "3299.00").
const toReais = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2);

export default async function EditarProdutoPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireCapability("product:update");
  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    getCategoriesForSelect(),
  ]);

  if (!product) notFound();

  const initial: ProductInitial = {
    name: product.name,
    description: product.description,
    brand: product.brand ?? "",
    categoryId: product.categoryId,
    price: toReais(product.priceCents),
    compareAt: toReais(product.compareCents),
    imageUrl: product.imageUrl,
    stock: String(product.stock),
    featured: product.featured,
    active: product.active,
    variants: product.variants.map((v) => ({
      name: v.name,
      sku: v.sku,
      price: toReais(v.priceCents),
      stock: String(v.stock),
    })),
  };

  // Vincula o id do produto à server action.
  const action = updateProduct.bind(null, product.id);

  return (
    <div>
      <div className="mb-6">
        <Link href="/painel/produtos" className="text-sm text-brand hover:underline">
          ← Voltar para produtos
        </Link>
        <h2 className="mt-1 font-display text-xl font-semibold">Editar: {product.name}</h2>
      </div>

      <ProductForm
        action={action}
        categories={categories}
        canEditPrice={can(user.role, "product:price")}
        initial={initial}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
