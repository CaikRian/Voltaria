import Link from "next/link";
import { requireStaff } from "@/lib/auth-helpers";
import { ROLE_LABELS, can, type Role } from "@/lib/permissions";

// Trava de papel no SERVIDOR: só VENDEDOR/GERENTE/ADMIN entram.
// (Não confiamos só em esconder o link no front.)
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();

  return (
    <div className="container-x py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Painel</h1>
          <p className="text-sm text-ink-muted">
            {user.name} · {ROLE_LABELS[user.role as Role] ?? user.role}
          </p>
        </div>
        <nav className="flex gap-1 text-sm">
          <Link href="/painel" className="rounded-lg px-3 py-1.5 hover:bg-brand-soft">Visão geral</Link>
          <Link href="/painel/produtos" className="rounded-lg px-3 py-1.5 hover:bg-brand-soft">Produtos</Link>
          <Link href="/painel/pedidos" className="rounded-lg px-3 py-1.5 hover:bg-brand-soft">Pedidos</Link>
          {can(user.role, "question:answer") && (
            <Link href="/painel/duvidas" className="rounded-lg px-3 py-1.5 hover:bg-brand-soft">Dúvidas</Link>
          )}
          {can(user.role, "content:moderate") && (
            <Link href="/painel/avaliacoes" className="rounded-lg px-3 py-1.5 hover:bg-brand-soft">Avaliações</Link>
          )}
          {can(user.role, "user:manage") && (
            <Link href="/painel/usuarios" className="rounded-lg px-3 py-1.5 hover:bg-brand-soft">Usuários</Link>
          )}
        </nav>
      </div>
      {children}
    </div>
  );
}
