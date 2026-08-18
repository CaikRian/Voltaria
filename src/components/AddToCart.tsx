"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

type Variant = { id: string; name: string; priceCents: number | null; stock: number };

type Props = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  basePriceCents: number;
  stock: number;
  variants: Variant[];
};

export function AddToCart({
  productId,
  slug,
  name,
  imageUrl,
  basePriceCents,
  stock,
  variants,
}: Props) {
  const add = useCart((s) => s.add);
  const closeCart = useCart((s) => s.close);
  const router = useRouter();
  const [selected, setSelected] = useState<Variant | null>(
    variants.length > 0 ? variants[0] : null
  );

  const currentStock = selected ? selected.stock : stock;
  const currentPrice = selected?.priceCents ?? basePriceCents;
  const outOfStock = currentStock <= 0;

  // Carrinho é só Zustand/localStorage (sem round-trip de servidor), então não há
  // "pending" de verdade — isso é só uma confirmação visual breve do clique.
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 1400);
    return () => clearTimeout(t);
  }, [justAdded]);

  function addCurrentItem() {
    add({
      productId,
      slug,
      name,
      imageUrl,
      variantName: selected?.name,
      unitCents: currentPrice,
    });
  }

  function handleAdd() {
    addCurrentItem();
    setJustAdded(true);
  }

  function handleBuyNow() {
    addCurrentItem();
    closeCart();
    router.push("/checkout");
  }

  return (
    <div className="flex flex-col gap-4">
      {variants.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Opções</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const active = selected?.id === v.id;
              const disabled = v.stock <= 0;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  disabled={disabled}
                  className={`rounded-xl border px-4 py-2 text-sm transition-colors ${
                    active
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line hover:border-ink-soft"
                  } ${disabled ? "cursor-not-allowed opacity-40 line-through" : ""}`}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        {outOfStock ? (
          <span className="font-medium text-deal">Esgotado</span>
        ) : currentStock <= 5 ? (
          <span className="font-medium text-deal">Últimas {currentStock} unidades!</span>
        ) : (
          <span className="flex items-center gap-1.5 font-medium text-ok">
            <span className="h-2 w-2 rounded-full bg-ok" /> Em estoque
          </span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button size="lg" onClick={handleBuyNow} disabled={outOfStock} className="w-full shadow-card">
          Comprar agora
        </Button>
        <Button size="lg" variant="ghost" onClick={handleAdd} disabled={outOfStock} className="w-full overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={justAdded ? "added" : "idle"}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="inline-block"
            >
              {justAdded ? "Adicionado ✓" : "Adicionar ao carrinho"}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
      {!outOfStock && (
        <p className="text-center text-xs text-ink-muted">Finalize com segurança pelo Mercado Pago.</p>
      )}
    </div>
  );
}
