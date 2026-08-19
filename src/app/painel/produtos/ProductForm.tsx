"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import type { ProductFormState } from "@/lib/actions/products";

type Category = { id: string; name: string };

type VariantRow = { name: string; sku: string; price: string; stock: string };

export type ProductInitial = {
  name: string;
  description: string;
  brand: string;
  categoryId: string;
  price: string; // em reais
  compareAt: string; // em reais
  imageUrl: string;
  stock: string;
  featured: boolean;
  active: boolean;
  variants: VariantRow[];
};

type Props = {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  categories: Category[];
  canEditPrice: boolean;
  initial?: ProductInitial;
  submitLabel: string;
};

const empty: ProductInitial = {
  name: "",
  description: "",
  brand: "",
  categoryId: "",
  price: "",
  compareAt: "",
  imageUrl: "",
  stock: "0",
  featured: false,
  active: true,
  variants: [],
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <span className="text-xs text-deal">{errors[0]}</span>;
}

export function ProductForm({ action, categories, canEditPrice, initial, submitLabel }: Props) {
  const init = initial ?? empty;
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(action, {});
  const [variants, setVariants] = useState<VariantRow[]>(init.variants);
  const [imageUrl, setImageUrl] = useState(init.imageUrl);
  const [price, setPrice] = useState(init.price);
  const [compareAt, setCompareAt] = useState(init.compareAt);
  const [stock, setStock] = useState(init.stock);
  const [active, setActive] = useState(init.active);
  const [featured, setFeatured] = useState(init.featured);
  const fe = state.fieldErrors ?? {};
  const variantStock = variants.reduce((total, variant) => total + (Number(variant.stock) || 0), 0);
  const displayedStock = variants.length ? variantStock : Number(stock) || 0;
  const discount = Number(compareAt) > Number(price) && Number(price) > 0
    ? Math.round((1 - Number(price) / Number(compareAt)) * 100)
    : 0;

  // Variações são enviadas como JSON num input oculto (tipos corretos p/ o servidor).
  const variantsJson = JSON.stringify(
    variants
      .filter((v) => v.name.trim() && v.sku.trim())
      .map((v) => ({
        name: v.name,
        sku: v.sku,
        stock: Number(v.stock) || 0,
        price: v.price === "" ? undefined : Number(v.price),
      }))
  );

  function updateVariant(i: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <form action={formAction} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
      {/* Coluna principal */}
      <div className="flex flex-col gap-5">
        {state.error && (
          <p className="rounded-lg bg-deal/10 px-3 py-2 text-sm text-deal">{state.error}</p>
        )}

        <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card"><div className="mb-5"><p className="font-display text-lg font-semibold">Informações principais</p><p className="text-xs text-ink-muted">Nome, marca e descrição apresentados ao cliente</p></div><div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium">Nome do produto</span>
            <input name="name" defaultValue={init.name} required className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand" />
            <FieldError errors={fe.name} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Marca</span>
            <input name="brand" defaultValue={init.brand} className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Categoria</span>
            <select name="categoryId" defaultValue={init.categoryId} required className="h-11 rounded-xl border border-line px-3 text-sm focus:border-brand">
              <option value="">Selecione...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <FieldError errors={fe.categoryId} />
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium">Descrição</span>
          <textarea name="description" defaultValue={init.description} rows={4} required className="rounded-xl border border-line px-4 py-3 text-sm focus:border-brand" />
          <FieldError errors={fe.description} />
        </label></section>

        {/* Preços */}
        <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="font-display text-lg font-semibold">Preço e disponibilidade</p><p className="text-xs text-ink-muted">Defina a oferta e o estoque do produto simples</p></div>{discount > 0 && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{discount}% de desconto</span>}</div><div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Preço (R$)</span>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
              disabled={!canEditPrice}
              className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand disabled:bg-mist disabled:text-ink-muted"
            />
            <FieldError errors={fe.price} />
            {!canEditPrice && <input type="hidden" name="price" value={price} />}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Preço &quot;de&quot; (R$)</span>
            <input
              name="compareAt"
              type="number"
              step="0.01"
              min="0"
              value={compareAt}
              onChange={(event) => setCompareAt(event.target.value)}
              disabled={!canEditPrice}
              className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand disabled:bg-mist disabled:text-ink-muted"
            />
            {!canEditPrice && <input type="hidden" name="compareAt" value={compareAt} />}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Estoque</span>
            <input name="stock" type="number" min="0" value={stock} onChange={(event) => setStock(event.target.value)} disabled={variants.length > 0} className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand disabled:bg-mist disabled:text-ink-muted" />
            {variants.length > 0 && <span className="text-[11px] text-ink-muted">Controlado pelas variações</span>}
          </label>
        </div>
        {!canEditPrice && (
          <p className="-mt-2 text-xs text-ink-muted">
            Somente Gerente ou Admin podem alterar preços. O valor atual será mantido.
          </p>
        )}</section>

        {/* Variações */}
        <div className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-semibold">Variações e SKUs</p>
              <p className="text-xs text-ink-muted">Use para cor, tamanho ou capacidade. Cada SKU deve ser único.</p>
            </div>
            <button
              type="button"
              onClick={() => setVariants((v) => [...v, { name: "", sku: "", price: "", stock: "0" }])}
              className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-mist"
            >
              + Adicionar
            </button>
          </div>

          {variants.length > 0 && (
            <div className="flex flex-col gap-3">
              {variants.map((v, i) => (
                <div key={i} className="rounded-xl border border-line bg-mist/40 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-ink-muted">Variação {i + 1}</span><div className="flex gap-1"><button type="button" onClick={() => setVariants((rows) => [...rows.slice(0, i + 1), { ...v, sku: `${v.sku}-COPIA` }, ...rows.slice(i + 1)])} className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand hover:bg-brand-soft">Duplicar</button><button type="button" onClick={() => setVariants((rows) => rows.filter((_, idx) => idx !== i))} aria-label="Remover variação" className="rounded-lg px-2 py-1 text-xs font-bold text-ink-muted hover:bg-red-50 hover:text-deal">Remover</button></div></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_100px_90px]">
                  <label><span className="mb-1 block text-[10px] font-bold uppercase text-ink-muted">Nome</span><input placeholder="Ex.: 256GB Preto" value={v.name} onChange={(e) => updateVariant(i, { name: e.target.value })} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm" /></label>
                  <label><span className="mb-1 block text-[10px] font-bold uppercase text-ink-muted">SKU</span><input placeholder="SKU único" value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value.toUpperCase() })} className="h-10 w-full rounded-lg border border-line bg-white px-3 font-mono text-sm" /></label>
                  <label><span className="mb-1 block text-[10px] font-bold uppercase text-ink-muted">Preço R$</span><input placeholder="Herda" type="number" step="0.01" value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} className="h-10 w-full rounded-lg border border-line bg-white px-2 text-sm" /></label>
                  <label><span className="mb-1 block text-[10px] font-bold uppercase text-ink-muted">Estoque</span><input placeholder="0" min="0" type="number" value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} className="h-10 w-full rounded-lg border border-line bg-white px-2 text-sm" /></label>
                </div>
                </div>
              ))}
            </div>
          )}
          {!variants.length && <button type="button" onClick={() => setVariants([{ name: "", sku: "", price: "", stock: "0" }])} className="grid w-full place-items-center rounded-xl border border-dashed border-line bg-mist/40 py-8 text-center text-sm font-semibold text-ink-soft hover:border-brand hover:text-brand">＋ Criar primeira variação</button>}
          <input type="hidden" name="variants" value={variantsJson} />
        </div>
      </div>

      {/* Coluna lateral */}
      <aside className="flex flex-col gap-5 xl:sticky xl:top-28 xl:self-start">
        <div className="rounded-xl2 border border-line bg-paper p-4 shadow-card">
          <p className="mb-2 text-sm font-medium">Imagem</p>
          <div className="relative mb-3 aspect-square overflow-hidden rounded-lg border border-line bg-mist">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Prévia" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-xs text-ink-muted">Prévia da imagem</div>
            )}
          </div>
          <input
            name="imageUrl"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="h-11 w-full rounded-xl border border-line px-4 text-sm focus:border-brand"
          />
          <FieldError errors={fe.imageUrl} />
          <p className="mt-2 text-xs text-ink-muted">Cole uma URL HTTPS. A prévia ajuda a conferir corte e qualidade antes de salvar.</p>
        </div>

        <div className="rounded-xl2 border border-line bg-paper p-4 shadow-card"><p className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-ink-muted">Publicação</p><div className="flex flex-col gap-3">
          <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${active ? "border-emerald-200 bg-emerald-50" : "border-line bg-mist"}`}><span><strong className="block text-sm">Produto ativo</strong><small className="text-xs text-ink-muted">Visível e disponível na loja</small></span>
            <input type="checkbox" name="active" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-5 w-5 accent-brand" />
          </label>
          <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${featured ? "border-amber-200 bg-amber-50" : "border-line bg-mist"}`}><span><strong className="block text-sm">Destaque na vitrine</strong><small className="text-xs text-ink-muted">Promover na página inicial</small></span>
            <input type="checkbox" name="featured" checked={featured} onChange={(event) => setFeatured(event.target.checked)} className="h-5 w-5 accent-brand" />
          </label>
        </div></div>

        <div className="rounded-xl2 bg-slate-900 p-4 text-white shadow-card"><p className="text-xs font-bold uppercase tracking-[.14em] text-white/50">Resumo antes de salvar</p><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-white/60">Preço</dt><dd className="font-bold">{Number(price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd></div><div className="flex justify-between"><dt className="text-white/60">Desconto</dt><dd className="font-bold">{discount ? `${discount}%` : "Sem promoção"}</dd></div><div className="flex justify-between"><dt className="text-white/60">Estoque total</dt><dd className={`font-bold ${displayedStock <= 5 ? "text-amber-300" : ""}`}>{displayedStock} un.</dd></div><div className="flex justify-between"><dt className="text-white/60">Variações</dt><dd className="font-bold">{variants.length}</dd></div></dl></div>

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </aside>
    </form>
  );
}
