import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminProduct, getCategoriesForSelect } from "@/lib/admin";
import { requireCapability } from "@/lib/auth-helpers";
import { can } from "@/lib/permissions";
import { updateProduct } from "@/lib/actions/products";
import { ProductForm, type ProductInitial } from "../ProductForm";
import { formatBRL } from "@/lib/format";
import { DeleteProductButton } from "../DeleteProductButton";

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
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-slate-900 to-brand-dark p-6 text-white shadow-pop"><div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-brand/25 blur-3xl" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Link href="/painel/produtos" className="text-sm font-semibold text-white/60 hover:text-white">← Voltar ao catálogo</Link><p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-white/50">Editor de produto</p><h1 className="mt-1 font-display text-2xl font-bold">{product.name}</h1><p className="mt-2 text-sm text-white/60">Organize as informações que serão exibidas na vitrine.</p></div><div className="flex gap-2"><a href={`/produtos/${product.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/20">Visualizar na loja ↗</a><div className="rounded-xl bg-white px-4 py-3 text-slate-950"><p className="text-[10px] font-bold uppercase tracking-wide opacity-50">Preço atual</p><p className="font-display text-lg font-black">{formatBRL(product.priceCents)}</p></div></div></div></section>

      <ProductForm
        action={action}
        categories={categories}
        canEditPrice={can(user.role, "product:price")}
        initial={initial}
        submitLabel="Salvar alterações"
      />

      {can(user.role, "product:delete") && (
        <section className="rounded-xl2 border border-red-200 bg-red-50/60 p-5 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[.16em] text-red-700">Zona de perigo</p><h2 className="mt-1 font-display text-lg font-semibold text-slate-900">Excluir este produto</h2><p className="mt-1 max-w-xl text-sm text-slate-600">A exclusão remove o produto e suas variações do catálogo. Esta ação é permanente e exige confirmação pelo nome.</p></div>
            <DeleteProductButton id={product.id} name={product.name} />
          </div>
        </section>
      )}
    </div>
  );
}
