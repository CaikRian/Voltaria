import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth-helpers";
import { getAdminUsers } from "@/lib/admin";
import { updateUserRoleAction } from "@/lib/actions/users";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { RoleForm } from "./RoleForm";
import { CreateTeamMemberForm } from "./CreateTeamMemberForm";
import { DeleteTeamMemberButton } from "./DeleteTeamMemberButton";

export const metadata: Metadata = { title: "Usuários · Painel" };

type SearchParams = Promise<{ q?: string }>;

export default async function PainelUsuariosPage({ searchParams }: { searchParams: SearchParams }) {
  const actingUser = await requireCapability("user:manage");
  const { q } = await searchParams;
  const users = await getAdminUsers(q);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-xl2 bg-gradient-to-br from-slate-900 via-brand-dark to-brand p-6 text-white shadow-pop"><div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Acessos e permissões</p><h2 className="mt-1 font-display text-3xl font-semibold">Equipe Heca - Store</h2><p className="mt-2 text-sm text-white/70">Crie acessos, defina responsabilidades e mantenha o controle da operação.</p></div><div className="rounded-xl bg-white/10 px-4 py-3 text-center"><p className="font-display text-2xl font-bold">{users.length}</p><p className="text-xs text-white/65">resultado(s)</p></div></div></section>

      {actingUser.role === "ADMIN" && <CreateTeamMemberForm />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-display text-xl font-semibold">Pessoas e papéis</h3><p className="text-sm text-ink-muted">Gerencie quem pode acessar cada área do painel.</p></div>
        <form className="relative w-full max-w-xs">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou e-mail..."
            className="h-10 w-full rounded-xl border border-line bg-mist px-4 text-sm focus:border-brand focus:bg-paper"
          />
        </form>
      </div>
      {!q && (
        <p className="-mt-4 rounded-xl border border-line bg-mist p-3 text-sm text-ink-muted">
          Mostrando apenas a equipe (Vendedor/Gerente/Admin). Busque por nome ou e-mail
          pra encontrar e promover um cliente.
        </p>
      )}

      {users.length === 0 ? (
        <div className="grid place-items-center rounded-xl2 border border-dashed border-line py-16 text-center">
          <p className="text-sm text-ink-muted">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {users.map((u) => {
            const isSelf = u.id === actingUser.id;
            const isLockedAdminTier = u.role === "ADMIN" && actingUser.role !== "ADMIN";
            return (
              <li key={u.id} className="rounded-xl2 border border-line bg-paper p-5 shadow-card transition hover:border-brand/30">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft font-display font-bold text-brand">{(u.name ?? u.email).charAt(0).toUpperCase()}</span><div><p className="font-medium">{u.name ?? "Sem nome"}</p>
                    <p className="text-sm text-ink-muted">{u.email}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-ink-muted">Desde {new Date(u.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p></div></div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium">
                      {ROLE_LABELS[u.role as Role] ?? u.role}
                    </span>
                    {isSelf && <span className="text-[11px] text-ink-muted">Você</span>}
                    {!isSelf && isLockedAdminTier && (
                      <span className="text-[11px] text-ink-muted">Só um administrador altera</span>
                    )}
                  </div>
                </div>
                {!isSelf && !isLockedAdminTier && (
                  <div className="mt-4 border-t border-line pt-4">
                    <RoleForm
                      action={updateUserRoleAction.bind(null, u.id)}
                      currentRole={u.role}
                      actingRole={actingUser.role}
                    />
                    {actingUser.role === "ADMIN" && u.role !== "CLIENTE" && <DeleteTeamMemberButton id={u.id} name={u.name ?? u.email} />}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
