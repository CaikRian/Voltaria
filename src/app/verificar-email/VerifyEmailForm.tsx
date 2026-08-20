"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resendVerificationAction, verifyEmailAction, type FormState } from "@/lib/actions/auth";

const initial: FormState = {};
const field = "h-12 w-full rounded-xl border border-line bg-white px-4 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10";

export function VerifyEmailForm({ initialEmail, initialCode }: { initialEmail: string; initialCode: string }) {
  const [state, verifyAction, pending] = useActionState(verifyEmailAction, initial);
  const [resendState, resendAction, resending] = useActionState(resendVerificationAction, initial);
  return <div className="mt-7 space-y-5">{state.success ? <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><p className="font-bold">{state.success}</p><Link href="/login" className="mt-3 inline-block font-bold text-brand hover:underline">Entrar na conta →</Link></div> : <form action={verifyAction} className="space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-medium">E-mail</span><input name="email" type="email" required defaultValue={initialEmail} className={field} /></label><label className="block"><span className="mb-1.5 block text-sm font-medium">Código de confirmação</span><input name="code" required defaultValue={initialCode} autoComplete="one-time-code" className={`${field} font-mono uppercase tracking-[.18em]`} /></label>{state.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}<button disabled={pending} className="h-12 w-full rounded-xl bg-brand font-bold text-white disabled:opacity-60">{pending ? "Confirmando..." : "Confirmar e-mail"}</button></form>}<form action={resendAction} className="space-y-3 border-t border-line pt-5"><label className="block"><span className="mb-1.5 block text-xs font-medium text-ink-muted">E-mail para reenviar o código</span><input name="email" type="email" required defaultValue={initialEmail} className={field} /></label>{resendState.success && <p className="text-xs text-emerald-700">{resendState.success}</p>}<button disabled={resending} className="text-sm font-bold text-brand hover:underline disabled:opacity-50">{resending ? "Enviando..." : "Enviar novo código"}</button></form></div>;
}
