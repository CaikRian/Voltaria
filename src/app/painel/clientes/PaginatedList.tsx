"use client";

import { useState } from "react";

// Pagina uma lista de itens já renderizados no servidor — sem round-trip ao
// banco, só esconde/mostra o que já veio. Serve pra seções longas (pedidos,
// conversas, avaliações, dúvidas) do perfil do cliente não descerem a página
// inteira quando o histórico é grande.
export function PaginatedList({
  items,
  pageSize = 5,
  as = "ul",
  listClassName = "flex flex-col gap-3",
}: {
  items: React.ReactNode[];
  pageSize?: number;
  as?: "ul" | "div";
  listClassName?: string;
}) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const visible = items.slice(start, start + pageSize);
  const Tag = as;

  return (
    <div>
      <Tag className={listClassName}>{visible}</Tag>
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <button
            type="button"
            disabled={current <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold disabled:pointer-events-none disabled:opacity-35 hover:border-brand hover:text-brand"
          >
            ‹ Anterior
          </button>
          <span className="text-xs font-semibold text-ink-muted">Página {current} de {pageCount}</span>
          <button
            type="button"
            disabled={current >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold disabled:pointer-events-none disabled:opacity-35 hover:border-brand hover:text-brand"
          >
            Próxima ›
          </button>
        </div>
      )}
    </div>
  );
}
