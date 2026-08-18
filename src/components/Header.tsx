"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/store/cart";
import { AuthButton } from "@/components/AuthButton";

const categorias = [
  { name: "Smartphones", slug: "smartphones" },
  { name: "Notebooks", slug: "notebooks" },
  { name: "Áudio", slug: "audio" },
  { name: "Casa & Cozinha", slug: "casa-cozinha" },
  { name: "Games", slug: "games" },
];

export function Header() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const open = useCart((s) => s.open);
  const count = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));

  function search(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/produtos?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="container-x flex h-16 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white font-display font-bold">
            V
          </span>
          <span className="hidden font-display text-lg font-semibold sm:block">Voltaria</span>
        </Link>

        {/* Busca */}
        <form onSubmit={search} className="relative flex-1 max-w-xl">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produtos, marcas..."
            aria-label="Buscar produtos"
            className="h-10 w-full rounded-xl border border-line bg-mist pl-10 pr-4 text-sm placeholder:text-ink-muted focus:border-brand focus:bg-paper"
          />
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeWidth={2} d="m21 21-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16Z" />
          </svg>
        </form>

        {/* Conta */}
        <AuthButton />

        {/* Carrinho */}
        <button
          onClick={open}
          className="relative grid h-10 w-10 place-items-center rounded-xl border border-line hover:bg-brand-soft"
          aria-label="Abrir carrinho"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13 5.4 5M7 13l-2 5m2-5 2 5m8-5 .5 5M9 21a1 1 0 11-2 0 1 1 0 012 0Zm10 0a1 1 0 11-2 0 1 1 0 012 0Z" />
          </svg>
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-deal px-1 text-[11px] font-bold text-white">
              {count}
            </span>
          )}
        </button>
      </div>

      {/* Navegação de categorias */}
      <nav className="border-t border-line bg-paper">
        <div className="container-x flex h-11 items-center gap-1 overflow-x-auto text-sm">
          <Link href="/produtos" className="whitespace-nowrap rounded-lg px-3 py-1.5 font-medium hover:bg-brand-soft">
            Todos
          </Link>
          {categorias.map((c) => (
            <Link
              key={c.slug}
              href={`/produtos?categoria=${c.slug}`}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-ink-soft hover:bg-brand-soft hover:text-ink"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
