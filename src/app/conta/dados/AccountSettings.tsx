"use client";

import { useActionState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { changePasswordAction, updateProfileAction, type AccountFormState } from "@/lib/actions/account";
import { Button } from "@/components/ui/Button";

function Feedback({ state }: { state: AccountFormState }) {
  return <>{state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}{state.success && <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}</>;
}

export function ProfileForm({ name, email, hasPassword }: { name: string; email: string; hasPassword: boolean }) {
  const [state, action, pending] = useActionState(updateProfileAction, {});
  const { update } = useSession();
  useEffect(() => {
    if (state.profile) void update(state.profile);
  }, [state.profile, update]);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <label className="block"><span className="text-sm font-medium">Nome da conta</span><input name="name" defaultValue={name} required className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-sm focus:border-brand" />{state.fieldErrors?.name && <span className="mt-1 block text-xs text-deal">{state.fieldErrors.name[0]}</span>}</label>
      <label className="block"><span className="text-sm font-medium">E-mail</span><input name="email" type="email" defaultValue={email} required className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-sm focus:border-brand" />{state.fieldErrors?.email && <span className="mt-1 block text-xs text-deal">{state.fieldErrors.email[0]}</span>}</label>
      {hasPassword && <label className="block"><span className="text-sm font-medium">Senha atual</span><input name="currentPassword" type="password" autoComplete="current-password" placeholder="Necessária somente para mudar o e-mail" className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-sm focus:border-brand" /></label>}
      {!hasPassword && <p className="text-xs text-ink-muted">O e-mail é administrado pelo seu provedor de login. Você ainda pode alterar o nome.</p>}
      <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar dados pessoais"}</Button>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, {});
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      {hasPassword && <label className="block"><span className="text-sm font-medium">Senha atual</span><input name="currentPassword" type="password" autoComplete="current-password" required className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-sm focus:border-brand" /></label>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="text-sm font-medium">Nova senha</span><input name="newPassword" type="password" autoComplete="new-password" required className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-sm focus:border-brand" />{state.fieldErrors?.newPassword && <span className="mt-1 block text-xs text-deal">{state.fieldErrors.newPassword[0]}</span>}</label>
        <label className="block"><span className="text-sm font-medium">Confirmar nova senha</span><input name="confirmPassword" type="password" autoComplete="new-password" required className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-sm focus:border-brand" />{state.fieldErrors?.confirmPassword && <span className="mt-1 block text-xs text-deal">{state.fieldErrors.confirmPassword[0]}</span>}</label>
      </div>
      <p className="text-xs text-ink-muted">Use ao menos 8 caracteres, incluindo uma letra e um número.</p>
      <Button type="submit" disabled={pending} variant="secondary">{pending ? "Atualizando..." : hasPassword ? "Alterar senha" : "Criar senha de acesso"}</Button>
    </form>
  );
}
