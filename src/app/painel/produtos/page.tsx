import Link from "next/link";
import type { Metadata } from "next";
import { getAdminProducts } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth-helpers";
import { can } from "@/lib/permissions";
import { formatBRL } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";
import { DeleteProductButton } from "./DeleteProductButton";
import { ProductCatalogDashboard } from "./ProductCatalogDashboard";

export const metadata: Metadata = { title: "Produtos · Painel" };

type SearchParams = Promise<{ q?: string; category?: string; visibility?: string; stock?: string; sort?: string; page?: string }>;

export default async function PainelProdutosPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = await searchParams;
  return <ProductCatalogDashboard filters={filters} />;
  // Layout anterior mantido abaixo como referência durante a transição.
  const { q } = filters;
  const [products, user] = await Promise.all([getAdminProducts(q), getCurrentUser()]);
  const canDelete = can(user?.role, "product:delete");

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative w-full max-w-xs">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar produto..."
            className="h-10 w-full rounded-xl border border-line bg-mist px-4 text-sm focus:border-brand focus:bg-paper"
          />
        </form>
        <ButtonLink href="/painel/produtos/novo">+ Novo produto</ButtonLink>
      </div>

      {products.length === 0 ? (
        <div className="grid place-items-center rounded-xl2 border border-dashed border-line py-16 text-center">
          <div>
            <p className="font-medium">Nenhum produto encontrado</p>
            <p className="mt-1 text-sm text-ink-muted">Comece cadastrando seu primeiro produto.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-line bg-paper">
          {/* Cabeçalho (desktop) */}
          <div className="hidden grid-cols-[56px_1fr_120px_100px_90px_140px] gap-3 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted sm:grid">
            <span></span>
            <span>Produto</span>
            <span>Categoria</span>
            <span>Preço</span>
            <span>Estoque</span>
            <span className="text-right">Ações</span>
          </div>

          <ul className="divide-y divide-line">
            {products.map((p) => {
              const stock =
                p.variants.length > 0
                  ? p.variants.reduce((s, v) => s + v.stock, 0)
                  : p.stock;
              return (
                <li key={p.id} className="grid grid-cols-[56px_1fr] items-center gap-3 px-4 py-3 sm:grid-cols-[56px_1fr_120px_100px_90px_140px]">
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-mist">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="flex items-center gap-2 text-xs text-ink-muted">
                      {p.brand ?? "—"}
                      {!p.active && (
                        <span className="rounded bg-ink/10 px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">inativo</span>
                      )}
                      {p.featured && (
                        <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand">destaque</span>
                      )}
                    </p>
                  </div>

                  <span className="hidden text-sm text-ink-soft sm:block">{p.category.name}</span>
                  <span className="hidden text-sm font-medium sm:block">{formatBRL(p.priceCents)}</span>
                  <span className={`hidden text-sm sm:block ${stock <= 5 ? "font-medium text-deal" : "text-ink-soft"}`}>
                    {stock} un.
                  </span>

                  <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-1">
                    <Link href={`/painel/produtos/${p.id}`} className="rounded-lg px-2 py-1 text-sm font-medium text-brand hover:bg-brand-soft">
                      Editar
                    </Link>
                    {canDelete && <DeleteProductButton id={p.id} name={p.name} />}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
