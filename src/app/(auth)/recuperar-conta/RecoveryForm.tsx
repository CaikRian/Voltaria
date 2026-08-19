"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { findAccountEmailAction, requestPasswordResetAction, type RecoveryState } from "@/lib/actions/auth-recovery";

const initial: RecoveryState = {};
function formatCpf(value: string) { return value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); }

export function RecoveryForm() {
  const [mode, setMode] = useState<"password" | "email">("password");
  const [cpf, setCpf] = useState("");
  const [emailState, emailAction, emailPending] = useActionState(findAccountEmailAction, initial);
  const [passwordState, passwordAction, passwordPending] = useActionState(requestPasswordResetAction, initial);
  const state = mode === "email" ? emailState : passwordState;

  return <div><div className="mb-5 grid grid-cols-2 rounded-xl bg-mist p-1"><button type="button" onClick={() => setMode("password")} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === "password" ? "bg-white text-brand shadow-card" : "text-ink-muted"}`}>Esqueci a senha</button><button type="button" onClick={() => setMode("email")} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === "email" ? "bg-white text-brand shadow-card" : "text-ink-muted"}`}>Esqueci o e-mail</button></div>
    {mode === "password" ? <form action={passwordAction} className="space-y-4"><div className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">Informe seu e-mail ou CPF. O link seguro será enviado para o e-mail cadastrado e expirará em 30 minutos.</div><label className="block"><span className="mb-1.5 block text-sm font-semibold">E-mail ou CPF</span><input name="identifier" required placeholder="voce@email.com ou 000.000.000-00" className="h-11 w-full rounded-xl border border-line px-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />{passwordState.fieldErrors?.identifier && <small className="text-deal">{passwordState.fieldErrors.identifier[0]}</small>}</label><Submit pending={passwordPending}>Enviar link de recuperação</Submit></form> : <form action={emailAction} className="space-y-4"><div className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">Por segurança, mostraremos apenas parte do endereço de e-mail vinculado ao CPF.</div><label className="block"><span className="mb-1.5 block text-sm font-semibold">CPF da conta</span><input name="cpf" required inputMode="numeric" value={cpf} onChange={(event) => setCpf(formatCpf(event.target.value))} maxLength={14} placeholder="000.000.000-00" className="h-11 w-full rounded-xl border border-line px-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />{emailState.fieldErrors?.cpf && <small className="text-deal">{emailState.fieldErrors.cpf[0]}</small>}</label><Submit pending={emailPending}>Localizar minha conta</Submit></form>}
    {state.error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}{state.success && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><p>{state.success}</p>{state.maskedEmail && <strong className="mt-2 block font-mono text-base">{state.maskedEmail}</strong>}</div>}<Link href="/login" className="mt-5 block text-center text-sm font-semibold text-brand hover:underline">← Voltar para o login</Link>
  </div>;
}
function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) { return <button disabled={pending} className="h-11 w-full rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-card hover:bg-brand-dark disabled:opacity-60">{pending ? "Processando..." : children}</button>; }
