"use client";

import { useTransition } from "react";

type Props = {
  id: string;
  hidden: boolean;
  action: (id: string, hidden: boolean) => Promise<void>;
};

// Botão genérico de ocultar/reexibir, reusado por avaliações e dúvidas no painel —
// mesmo padrão de DeleteProductButton.tsx, mas alternando um booleano em vez de excluir.
export function ToggleVisibilityButton({ id, hidden, action }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => action(id, !hidden))}
      disabled={pending}
      className="rounded-lg border border-line px-2 py-1 text-xs font-medium text-ink-muted hover:bg-mist disabled:opacity-50"
    >
      {pending ? "..." : hidden ? "Reexibir" : "Ocultar"}
    </button>
  );
}
