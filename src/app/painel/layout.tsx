import Link from "next/link";
import { requireStaff } from "@/lib/auth-helpers";
import { ROLE_LABELS, can, type Role } from "@/lib/permissions";
import { getPanelNavigationCounts } from "@/lib/admin";
import { PanelNav } from "./PanelNav";
import { RealtimePanelSync } from "./RealtimePanelSync";

// Trava de papel no SERVIDOR: só VENDEDOR/GERENTE/ADMIN entram.
// (Não confiamos só em esconder o link no front.)
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const [user, counts] = await Promise.all([requireStaff(), getPanelNavigationCounts()]);
  const items = [
    { href: "/painel", label: "Visão geral", icon: "⌂" },
    { href: "/painel/produtos", label: "Produtos", icon: "▦" },
    { href: "/painel/pedidos", label: "Pedidos", icon: "□", badge: counts.refunds },
    { href: "/painel/conversas", label: "Conversas", icon: "✦", badge: counts.chats },
    { href: "/painel/relatorios", label: "Relatórios", icon: "↗" },
    ...(can(user.role, "question:answer") ? [{ href: "/painel/duvidas", label: "Dúvidas", icon: "?", badge: counts.questions }] : []),
    ...(can(user.role, "content:moderate") ? [{ href: "/painel/avaliacoes", label: "Avaliações", icon: "★" }] : []),
    ...(can(user.role, "user:manage") ? [{ href: "/painel/usuarios", label: "Equipe", icon: "♙" }] : []),
  ];

  return (
    <div className="container-x py-6 sm:py-8">
      <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-indigo-500 px-5 py-5 text-white shadow-pop sm:px-7">
        <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Central de operação</p><h1 className="mt-1 font-display text-2xl font-semibold">Painel Voltaria</h1><p className="mt-1 text-sm text-white/75">{user.name} · {ROLE_LABELS[user.role as Role] ?? user.role}</p></div><Link href="/" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">Ver loja ↗</Link></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start"><PanelNav items={items} /></aside>
        <div className="min-w-0">{children}</div>
      </div>
      <RealtimePanelSync />
    </div>
  );
}
