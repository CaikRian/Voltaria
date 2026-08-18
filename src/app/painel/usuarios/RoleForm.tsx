"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { USER_ROLES } from "@/lib/validators";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import type { UserRoleFormState } from "@/lib/actions/users";

type Props = {
  action: (state: UserRoleFormState, formData: FormData) => Promise<UserRoleFormState>;
  currentRole: string;
  actingRole: string;
};

export function RoleForm({ action, currentRole, actingRole }: Props) {
  const [state, formAction, pending] = useActionState<UserRoleFormState, FormData>(action, {});

  // Só ADMIN pode conceder o papel de Administrador — a regra que vale de verdade
  // fica no servidor, em updateUserRoleAction; isso aqui só evita oferecer uma
  // opção que o servidor rejeitaria de qualquer forma.
  const availableRoles = actingRole === "ADMIN" ? USER_ROLES : USER_ROLES.filter((r) => r !== "ADMIN");

  return (
    // key={currentRole}: sem remontar o form, o <select defaultValue> fica preso no
    // papel de quando a página abriu, mesmo depois do revalidatePath trazer o novo.
    <form key={currentRole} action={formAction} className="flex flex-wrap items-center gap-3">
      {state.error && <p className="w-full text-sm text-deal">{state.error}</p>}
      {state.success && <p className="w-full text-sm text-ok">Papel atualizado.</p>}

      <label className="flex items-center gap-2">
        <span className="text-sm font-medium">Papel</span>
        <select
          name="role"
          defaultValue={currentRole}
          className="h-10 rounded-xl border border-line px-3 text-sm focus:border-brand"
        >
          {availableRoles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r as Role]}
            </option>
          ))}
        </select>
      </label>

      <Button type="submit" size="sm" disabled={pending} className="shrink-0">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
