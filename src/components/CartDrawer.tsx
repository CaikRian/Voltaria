"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useCart } from "@/store/cart";
import { formatBRL } from "@/lib/format";
import { ButtonLink, Button } from "@/components/ui/Button";
import { ShippingCalculator } from "@/components/ShippingCalculator";

export function CartDrawer() {
  const { items, isOpen, close, remove, setQty, totalCents } = useCart();
  const total = totalCents();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        className={`fixed inset-0 z-50 bg-ink/40 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isOpen}
      />

      {/* Painel */}
      <aside
        role="dialog"
        aria-label="Carrinho de compras"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-paper shadow-pop transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="font-display text-lg font-semibold">Seu carrinho</h2>
          <button onClick={close} aria-label="Fechar carrinho" className="rounded-lg p-1 hover:bg-mist">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeWidth={2} d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-ink-soft">Seu carrinho está vazio.</p>
            <Button variant="ghost" onClick={close}>
              Continuar comprando
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              <ul className="flex flex-col gap-4">
                <AnimatePresence initial={false}>
                  {items.map((i) => (
                    <motion.li
                      key={`${i.productId}-${i.variantName}`}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex gap-3 overflow-hidden"
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-mist">
                        <Image src={i.imageUrl} alt={i.name} fill sizes="80px" className="object-cover" />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <p className="text-sm font-medium leading-snug">{i.name}</p>
                        {i.variantName && (
                          <p className="text-xs text-ink-muted">{i.variantName}</p>
                        )}
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-line">
                            <button
                              onClick={() => setQty(i.productId, i.variantName, i.qty - 1)}
                              className="grid h-8 w-8 place-items-center hover:bg-mist"
                              aria-label="Diminuir quantidade"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm">{i.qty}</span>
                            <button
                              onClick={() => setQty(i.productId, i.variantName, i.qty + 1)}
                              className="grid h-8 w-8 place-items-center hover:bg-mist"
                              aria-label="Aumentar quantidade"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-sm font-semibold">{formatBRL(i.unitCents * i.qty)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => remove(i.productId, i.variantName)}
                        aria-label="Remover item"
                        className="self-start rounded-lg p-1 text-ink-muted hover:bg-mist hover:text-deal"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeWidth={2} d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>

            <div className="border-t border-line p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-ink-soft">Subtotal</span>
                <span className="font-display text-xl font-semibold">{formatBRL(total)}</span>
              </div>
              <div className="mb-4">
                <ShippingCalculator subtotalCents={total} />
              </div>
              <ButtonLink href="/checkout" size="lg" className="w-full" onClick={close}>
                Finalizar compra
              </ButtonLink>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
