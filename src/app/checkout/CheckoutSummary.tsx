"use client";

import { useCart } from "@/store/cart";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/Button";

type Props = {
  pending: boolean;
  error?: string;
  shippingCents: number | null; // null = nenhuma opção de frete selecionada ainda
  shippingLabel: string | null;
};

export function CheckoutSummary({ pending, error, shippingCents, shippingLabel }: Props) {
  const { items, totalCents, clear } = useCart();
  const total = totalCents();
  const grandTotal = total + (shippingCents ?? 0);
  const canSubmit = !pending && items.length > 0 && shippingCents !== null;

  return (
    <aside className="h-fit rounded-xl2 border border-line bg-paper p-6 shadow-card lg:sticky lg:top-24">
      <h2 className="mb-4 font-display text-lg font-semibold">Resumo</h2>

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">Seu carrinho está vazio.</p>
      ) : (
        <>
          <ul className="mb-4 flex flex-col gap-3">
            {items.map((i) => (
              <li key={`${i.productId}-${i.variantName}`} className="flex justify-between text-sm">
                <span className="pr-2 text-ink-soft">
                  {i.qty}× {i.name}
                  {i.variantName ? ` (${i.variantName})` : ""}
                </span>
                <span className="whitespace-nowrap font-medium">{formatBRL(i.unitCents * i.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-ink-soft">
              <span>Subtotal</span>
              <span>{formatBRL(total)}</span>
            </div>
            <div className="flex justify-between text-ink-soft">
              <span>Frete{shippingLabel ? ` (${shippingLabel})` : ""}</span>
              <span>
                {shippingCents === null ? "Informe o CEP" : shippingCents === 0 ? "Grátis" : formatBRL(shippingCents)}
              </span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-display text-lg font-semibold">
              <span>Total</span>
              <span>{formatBRL(grandTotal)}</span>
            </div>
          </div>

          {error && (
            <p className="mb-3 mt-4 rounded-lg bg-deal/10 px-3 py-2 text-sm text-deal">{error}</p>
          )}

          <Button type="submit" size="lg" className="mt-4 w-full" disabled={!canSubmit}>
            {pending ? "Processando..." : shippingCents === null ? "Selecione o frete" : `Pagar ${formatBRL(grandTotal)}`}
          </Button>
          <button
            type="button"
            onClick={clear}
            className="mt-3 w-full text-center text-xs text-ink-muted hover:text-deal"
          >
            Esvaziar carrinho
          </button>
        </>
      )}
    </aside>
  );
}
