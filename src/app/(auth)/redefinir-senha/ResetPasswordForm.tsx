"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { resetPasswordAction, type RecoveryState } from "@/lib/actions/auth-recovery";

export function ResetPasswordForm({ token }: { token: string }) {
  const action = resetPasswordAction.bind(null, token);
  const [state, formAction, pending] = useActionState<RecoveryState, FormData>(action, {});
  const [show, setShow] = useState(false);
  if (state.success) return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">✓</span><p className="mt-3 font-bold text-emerald-900">{state.success}</p><Link href="/login" className="mt-4 inline-block rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">Entrar na conta</Link></div>;
  return <form action={formAction} className="space-y-4">{state.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}<label className="block"><span className="mb-1.5 block text-sm font-semibold">Nova senha</span><input name="password" type={show ? "text" : "password"} required autoComplete="new-password" className="h-11 w-full rounded-xl border border-line px-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" placeholder="Mínimo 8 caracteres" />{state.fieldErrors?.password && <small className="text-deal">{state.fieldErrors.password[0]}</small>}</label><label className="block"><span className="mb-1.5 block text-sm font-semibold">Confirmar nova senha</span><input name="confirm" type={show ? "text" : "password"} required autoComplete="new-password" className="h-11 w-full rounded-xl border border-line px-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />{state.fieldErrors?.confirm && <small className="text-deal">{state.fieldErrors.confirm[0]}</small>}</label><label className="flex items-center gap-2 text-xs text-ink-muted"><input type="checkbox" checked={show} onChange={(event) => setShow(event.target.checked)} className="accent-brand" />Mostrar senhas</label><button disabled={pending} className="h-11 w-full rounded-xl bg-brand text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">{pending ? "Salvando..." : "Criar nova senha"}</button></form>;
}
