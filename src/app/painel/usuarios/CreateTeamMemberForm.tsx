"use client";

import { useActionState, useState } from "react";
import { createTeamMemberAction, type TeamMemberFormState } from "@/lib/actions/users";

export function CreateTeamMemberForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<TeamMemberFormState, FormData>(createTeamMemberAction, {});
  return <section className="overflow-hidden rounded-xl2 border border-brand/20 bg-paper shadow-card">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 bg-gradient-to-r from-brand-soft to-white p-5 text-left"><span><span className="block font-display text-lg font-semibold">Adicionar pessoa à equipe</span><span className="mt-1 block text-sm text-ink-muted">Crie um acesso de vendedor, gerente ou administrador.</span></span><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-xl font-bold text-white">{open ? "−" : "+"}</span></button>
    {open && <form action={action} className="grid gap-4 border-t border-line p-5 sm:grid-cols-2">
      {state.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      {state.success && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700 sm:col-span-2">Conta de {state.createdName} criada. Compartilhe a senha temporária por um canal seguro.</p>}
      <Field label="Nome" name="name" placeholder="Nome completo" error={state.fieldErrors?.name?.[0]} />
      <Field label="E-mail" name="email" type="email" placeholder="pessoa@empresa.com" error={state.fieldErrors?.email?.[0]} />
      <label className="text-sm font-medium">Papel<select name="role" defaultValue="VENDEDOR" className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3"><option value="VENDEDOR">Vendedor</option><option value="GERENTE">Gerente</option><option value="ADMIN">Administrador</option></select>{state.fieldErrors?.role && <span className="mt-1 block text-xs text-red-600">{state.fieldErrors.role[0]}</span>}</label>
      <Field label="Senha temporária" name="password" type="password" placeholder="Mínimo 8 caracteres" error={state.fieldErrors?.password?.[0]} />
      <div className="sm:col-span-2"><button disabled={pending} className="h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">{pending ? "Criando acesso..." : "Criar membro da equipe"}</button></div>
    </form>}
  </section>;
}

function Field({ label, error, ...props }: { label: string; error?: string; name: string; type?: string; placeholder?: string }) { return <label className="text-sm font-medium">{label}<input {...props} className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 outline-none focus:border-brand" />{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>; }
