import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { ROLE_LABELS, isStaff, type Role } from "@/lib/permissions";

export const metadata: Metadata = { title: "Minha conta" };

export default async function ContaPage() {
  // Middleware já garante login; requireUser dá o usuário tipado.
  const user = await requireUser();

  return (
    <div className="container-x py-10">
      <div className="mb-8 flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-xl font-semibold text-white">
          {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold">Olá, {user.name ?? "cliente"}!</h1>
          <p className="text-sm text-ink-muted">{user.email}</p>
        </div>
        <span className="ml-auto rounded-lg bg-brand-soft px-3 py-1 text-sm font-medium text-brand">
          {ROLE_LABELS[user.role as Role] ?? user.role}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card href="/conta/pedidos" title="Meus pedidos" desc="Acompanhe status e histórico" />
        <Card href="/conta/dados" title="Meus dados" desc="Nome, e-mail e endereços" />
        <Card href="/conta/privacidade" title="Privacidade (LGPD)" desc="Exportar ou excluir dados" />
        {isStaff(user.role) && (
          <Card href="/painel" title="Painel do vendedor" desc="Gerenciar produtos e pedidos" highlight />
        )}
      </div>

      <p className="mt-8 text-sm text-ink-muted">
        As próximas etapas do projeto aparecerão aqui.
      </p>
    </div>
  );
}

function Card({
  href,
  title,
  desc,
  highlight,
}: {
  href: string;
  title: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl2 border p-5 shadow-card transition-colors ${
        highlight
          ? "border-brand bg-brand-soft hover:bg-brand/10"
          : "border-line bg-paper hover:border-brand"
      }`}
    >
      <p className="font-display font-semibold">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{desc}</p>
    </Link>
  );
}
