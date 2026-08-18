"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  variantName?: string;
  unitCents: number;
  qty: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (productId: string, variantName?: string) => void;
  setQty: (productId: string, variantName: string | undefined, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  totalCents: () => number;
  count: () => number;
};

// Chave única por produto + variação.
const key = (id: string, v?: string) => `${id}::${v ?? ""}`;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      add: (item, qty = 1) =>
        set((state) => {
          const k = key(item.productId, item.variantName);
          const existing = state.items.find((i) => key(i.productId, i.variantName) === k);
          if (existing) {
            return {
              items: state.items.map((i) =>
                key(i.productId, i.variantName) === k ? { ...i, qty: i.qty + qty } : i
              ),
              isOpen: true,
            };
          }
          return { items: [...state.items, { ...item, qty }], isOpen: true };
        }),

      remove: (productId, variantName) =>
        set((state) => ({
          items: state.items.filter(
            (i) => key(i.productId, i.variantName) !== key(productId, variantName)
          ),
        })),

      setQty: (productId, variantName, qty) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              key(i.productId, i.variantName) === key(productId, variantName)
                ? { ...i, qty: Math.max(1, qty) }
                : i
            )
            .filter((i) => i.qty > 0),
        })),

      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),

      totalCents: () => get().items.reduce((sum, i) => sum + i.unitCents * i.qty, 0),
      count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: "minha-loja-cart" }
  )
);
