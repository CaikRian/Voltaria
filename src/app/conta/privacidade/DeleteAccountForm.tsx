"use client";

import { useActionState } from "react";
import { deleteAccountAction } from "@/lib/actions/account";

export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(deleteAccountAction, {});
  return (
    <form action={action} className="mt-5 space-y-4">
      {state.error && <p className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-800">{state.error}</p>}
      <label className="block"><span className="text-sm font-medium">Digite EXCLUIR para confirmar</span><input name="confirmation" required autoComplete="off" className="mt-1.5 h-11 w-full rounded-xl border border-red-200 bg-white px-4 text-sm focus:border-red-500" />{state.fieldErrors?.confirmation && <span className="mt-1 block text-xs text-red-700">{state.fieldErrors.confirmation[0]}</span>}</label>
      {hasPassword && <label className="block"><span className="text-sm font-medium">Senha atual</span><input name="currentPassword" type="password" required autoComplete="current-password" className="mt-1.5 h-11 w-full rounded-xl border border-red-200 bg-white px-4 text-sm focus:border-red-500" /></label>}
      <button type="submit" disabled={pending} className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50">{pending ? "Excluindo conta..." : "Excluir permanentemente minha conta"}</button>
    </form>
  );
}
