"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/store/cart";
import { AuthButton } from "@/components/AuthButton";
import { SitePreferencesMenu, useSitePreferences } from "@/components/SitePreferences";

const copy = {
  "pt-BR": { search:"Buscar produtos, marcas...", searchLabel:"Buscar produtos" },
  en: { search:"Search products and brands...", searchLabel:"Search products" },
  es: { search:"Buscar productos y marcas...", searchLabel:"Buscar productos" },
};

const categorias = [
  { name: "Smartphones", slug: "smartphones" },
  { name: "Notebooks", slug: "notebooks" },
  { name: "Áudio", slug: "audio" },
  { name: "Casa & Cozinha", slug: "casa-cozinha" },
  { name: "Games", slug: "games" },
];

export function Header() {
  const { language } = useSitePreferences();
  const text = copy[language];
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchProduct[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const searchRef = useRef<HTMLFormElement>(null);
  const open = useCart((s) => s.open);
  const count = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
      router.push(`/produtos/${suggestions[activeSuggestion].slug}`);
      setSearchOpen(false);
      return;
    }
    router.push(`/produtos?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
  }

  useEffect(() => {
    const term = q.trim();
    setActiveSuggestion(-1);
    if (term.length < 2) { setSuggestions([]); setSearching(false); return; }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/produtos/sugestoes?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("search_failed");
        const data = await response.json() as { products: SearchProduct[] };
        setSuggestions(data.products);
        setSearchOpen(true);
      } catch (error) { if ((error as Error).name !== "AbortError") setSuggestions([]); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 250);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [q]);

  useEffect(() => {
    function close(event: MouseEvent) { if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="container-x flex h-16 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white font-display font-bold">
            H
          </span>
          <span className="hidden font-display text-lg font-semibold sm:block">Heca Store</span>
        </Link>

        {/* Busca */}
        <form ref={searchRef} onSubmit={search} className="relative max-w-xl flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => q.trim().length >= 2 && setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); setActiveSuggestion((current) => Math.min(current + 1, suggestions.length - 1)); }
              if (event.key === "ArrowUp") { event.preventDefault(); setActiveSuggestion((current) => Math.max(current - 1, -1)); }
              if (event.key === "Escape") setSearchOpen(false);
            }}
            placeholder={text.search}
            aria-label={text.searchLabel}
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
          {searching && <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-brand" aria-label="Buscando" />}
          {searchOpen && q.trim().length >= 2 && <div className="fixed left-3 right-3 top-[68px] z-50 overflow-hidden rounded-2xl border border-line bg-white shadow-2xl sm:absolute sm:left-0 sm:right-0 sm:top-[calc(100%+8px)]">
            <div className="flex items-center justify-between border-b border-line bg-mist/60 px-4 py-2"><span className="text-[10px] font-black uppercase tracking-[.14em] text-ink-muted">Sugestões para você</span><span className="text-[10px] text-ink-muted">↑↓ para navegar</span></div>
            {suggestions.length > 0 ? <ul className="max-h-[420px] overflow-y-auto py-1">{suggestions.map((product, index) => <li key={product.id}><Link href={`/produtos/${product.slug}`} onClick={() => setSearchOpen(false)} onMouseEnter={() => setActiveSuggestion(index)} className={`grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition ${activeSuggestion === index ? "bg-brand-soft/70" : "hover:bg-mist"}`}><span className="h-12 w-12 overflow-hidden rounded-xl border border-line bg-mist"><img src={product.imageUrl} alt="" className="h-full w-full object-cover" /></span><span className="min-w-0"><strong className="block truncate text-sm text-ink">{product.name}</strong><span className="mt-0.5 block truncate text-xs text-ink-muted">{product.brand || product.category.name} · {product.category.name}</span><span className={`mt-1 inline-block text-[10px] font-bold ${product.inStock ? "text-emerald-700" : "text-red-600"}`}>{product.inStock ? "Disponível" : "Esgotado"}</span></span><span className="text-right"><strong className="block whitespace-nowrap text-sm text-brand">{money(product.priceCents)}</strong>{product.compareCents && product.compareCents > product.priceCents ? <span className="text-[10px] text-ink-muted line-through">{money(product.compareCents)}</span> : null}</span></Link></li>)}</ul> : !searching && <div className="px-5 py-8 text-center"><span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-mist text-lg">⌕</span><p className="mt-2 text-sm font-semibold">Nenhum produto encontrado</p><p className="mt-1 text-xs text-ink-muted">Tente outro nome, marca ou categoria.</p></div>}
            <button type="submit" onMouseEnter={() => setActiveSuggestion(-1)} className="flex w-full items-center justify-between border-t border-line bg-slate-950 px-4 py-3 text-left text-xs font-bold text-white hover:bg-brand-dark"><span>Ver todos os resultados para “{q.trim()}”</span><span>→</span></button>
          </div>}
        </form>

        <SitePreferencesMenu />

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

type SearchProduct = { id: string; name: string; slug: string; brand: string | null; imageUrl: string; priceCents: number; compareCents: number | null; inStock: boolean; category: { name: string } };
function money(cents: number) { return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
