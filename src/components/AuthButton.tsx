"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { isStaff, ROLE_LABELS, type Role } from "@/lib/permissions";

export function AuthButton() {
  const { data: session, status, update } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // O redirect após login/cadastro é uma navegação client-side (via server
  // action), então o SessionProvider não sabe que o cookie mudou — sem isso,
  // o botão continuava mostrando "Entrar" até um refresh manual da página.
  useEffect(() => {
    update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Fecha o menu ao clicar fora.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Carregando: placeholder discreto (evita "pisca" de conteúdo).
  if (status === "loading") {
    return <div className="h-10 w-10 animate-pulse rounded-xl bg-line" aria-hidden />;
  }

  // Deslogado: link para entrar.
  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-sm font-medium hover:bg-brand-soft"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H3m0 0 4-4m-4 4 4 4m6-11h4a2 2 0 012 2v10a2 2 0 01-2 2h-4" />
        </svg>
        <span className="hidden sm:inline">Entrar</span>
      </Link>
    );
  }

  const user = session.user;
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
  const staff = isStaff(user.role);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-dark"
        aria-label="Menu da conta"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-paper shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium">{user.name ?? "Minha conta"}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
            <span className="mt-1 inline-block rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-brand">
              {ROLE_LABELS[user.role as Role] ?? user.role}
            </span>
          </div>
          <nav className="py-1 text-sm">
            <Link href="/conta" onClick={() => setOpen(false)} className="block px-4 py-2 hover:bg-mist">
              Minha conta
            </Link>
            <Link href="/conta/pedidos" onClick={() => setOpen(false)} className="block px-4 py-2 hover:bg-mist">
              Meus pedidos
            </Link>
            {staff && (
              <Link href="/painel" onClick={() => setOpen(false)} className="block px-4 py-2 font-medium text-brand hover:bg-brand-soft">
                Painel do vendedor
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="block w-full px-4 py-2 text-left text-deal hover:bg-mist"
            >
              Sair
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
