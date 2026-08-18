"use client";

import { useTransition } from "react";
import { deleteProduct } from "@/lib/actions/products";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(() => deleteProduct(id));
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="rounded-lg px-2 py-1 text-sm text-ink-muted hover:bg-mist hover:text-deal disabled:opacity-50"
      aria-label={`Excluir ${name}`}
    >
      {pending ? "..." : "Excluir"}
    </button>
  );
}
