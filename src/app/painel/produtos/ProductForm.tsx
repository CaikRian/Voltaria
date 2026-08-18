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
  const fe = state.fieldErrors ?? {};

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
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Coluna principal */}
      <div className="flex flex-col gap-5">
        {state.error && (
          <p className="rounded-lg bg-deal/10 px-3 py-2 text-sm text-deal">{state.error}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
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

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Descrição</span>
          <textarea name="description" defaultValue={init.description} rows={4} required className="rounded-xl border border-line px-4 py-3 text-sm focus:border-brand" />
          <FieldError errors={fe.description} />
        </label>

        {/* Preços */}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Preço (R$)</span>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={init.price}
              required
              disabled={!canEditPrice}
              className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand disabled:bg-mist disabled:text-ink-muted"
            />
            <FieldError errors={fe.price} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Preço &quot;de&quot; (R$)</span>
            <input
              name="compareAt"
              type="number"
              step="0.01"
              min="0"
              defaultValue={init.compareAt}
              disabled={!canEditPrice}
              className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand disabled:bg-mist disabled:text-ink-muted"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Estoque</span>
            <input name="stock" type="number" min="0" defaultValue={init.stock} className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand" />
          </label>
        </div>
        {!canEditPrice && (
          <p className="-mt-2 text-xs text-ink-muted">
            Somente Gerente ou Admin podem alterar preços. O valor atual será mantido.
          </p>
        )}

        {/* Variações */}
        <div className="rounded-xl2 border border-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Variações (opcional)</p>
              <p className="text-xs text-ink-muted">Ex.: cor, capacidade. Deixe vazio se não houver.</p>
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
            <div className="flex flex-col gap-2">
              {variants.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_90px_80px_auto] items-center gap-2">
                  <input placeholder="Nome (ex.: 256GB Preto)" value={v.name} onChange={(e) => updateVariant(i, { name: e.target.value })} className="h-10 rounded-lg border border-line px-3 text-sm" />
                  <input placeholder="SKU" value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} className="h-10 rounded-lg border border-line px-3 text-sm" />
                  <input placeholder="Preço" type="number" step="0.01" value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} className="h-10 rounded-lg border border-line px-2 text-sm" />
                  <input placeholder="Estoque" type="number" value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} className="h-10 rounded-lg border border-line px-2 text-sm" />
                  <button type="button" onClick={() => setVariants((rows) => rows.filter((_, idx) => idx !== i))} aria-label="Remover variação" className="grid h-10 w-10 place-items-center rounded-lg text-ink-muted hover:bg-mist hover:text-deal">✕</button>
                </div>
              ))}
            </div>
          )}
          <input type="hidden" name="variants" value={variantsJson} />
        </div>
      </div>

      {/* Coluna lateral */}
      <aside className="flex flex-col gap-5">
        <div className="rounded-xl2 border border-line p-4">
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
          <p className="mt-2 text-xs text-ink-muted">
            Por enquanto usamos URL da imagem. Upload de arquivo pode ser adicionado depois.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl2 border border-line p-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={init.active} className="h-4 w-4 accent-brand" />
            Produto ativo (visível na loja)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" defaultChecked={init.featured} className="h-4 w-4 accent-brand" />
            Destacar na página inicial
          </label>
        </div>

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </aside>
    </form>
  );
}
