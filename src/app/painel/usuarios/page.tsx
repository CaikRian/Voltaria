import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth-helpers";
import { getAdminUsers } from "@/lib/admin";
import { updateUserRoleAction } from "@/lib/actions/users";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { RoleForm } from "./RoleForm";

export const metadata: Metadata = { title: "Usuários · Painel" };

type SearchParams = Promise<{ q?: string }>;

export default async function PainelUsuariosPage({ searchParams }: { searchParams: SearchParams }) {
  const actingUser = await requireCapability("user:manage");
  const { q } = await searchParams;
  const users = await getAdminUsers(q);

  return (
    <div>
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl font-semibold">Usuários</h2>
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
        <p className="mb-5 text-sm text-ink-muted">
          Mostrando apenas a equipe (Vendedor/Gerente/Admin). Busque por nome ou e-mail
          pra encontrar e promover um cliente.
        </p>
      )}

      {users.length === 0 ? (
        <div className="grid place-items-center rounded-xl2 border border-dashed border-line py-16 text-center">
          <p className="text-sm text-ink-muted">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {users.map((u) => {
            const isSelf = u.id === actingUser.id;
            const isLockedAdminTier = u.role === "ADMIN" && actingUser.role !== "ADMIN";
            return (
              <li key={u.id} className="rounded-xl2 border border-line bg-paper p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{u.name ?? "Sem nome"}</p>
                    <p className="text-sm text-ink-muted">{u.email}</p>
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
                  <div className="mt-3">
                    <RoleForm
                      action={updateUserRoleAction.bind(null, u.id)}
                      currentRole={u.role}
                      actingRole={actingUser.role}
                    />
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
