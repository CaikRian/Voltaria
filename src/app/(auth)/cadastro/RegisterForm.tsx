"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerAction, type FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const initial: FormState = {};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <span className="text-xs text-deal">{errors[0]}</span>;
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);
  const fe = state.fieldErrors ?? {};
  const [cpf, setCpf] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {state.error && (
        <p className="rounded-lg bg-deal/10 px-3 py-2 text-sm text-deal sm:col-span-2">{state.error}</p>
      )}

      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-sm font-medium">Nome completo</span>
        <input
          name="name"
          autoComplete="name"
          required
          className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand"
          placeholder="Seu nome"
        />
        <FieldError errors={fe.name} />
      </label>

      <label className="flex flex-col gap-1.5"><span className="text-sm font-medium">CPF</span><input name="cpf" inputMode="numeric" autoComplete="off" required value={cpf} onChange={(event) => setCpf(formatCpf(event.target.value))} maxLength={14} className="h-11 rounded-xl border border-line px-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" placeholder="000.000.000-00" /><FieldError errors={fe.cpf} /><span className="text-[10px] text-ink-muted">Um CPF pode estar vinculado a apenas uma conta.</span></label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">E-mail</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand"
          placeholder="voce@email.com"
        />
        <FieldError errors={fe.email} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Senha</span>
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand"
          placeholder="Mínimo 8 caracteres"
        />
        <FieldError errors={fe.password} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Confirmar senha</span>
        <input
          name="confirm"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand"
          placeholder="Repita a senha"
        />
        <FieldError errors={fe.confirm} />
      </label>

      <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft sm:col-span-2"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} className="h-4 w-4 accent-brand" />Mostrar senhas</label>

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full sm:col-span-2">
        {pending ? "Criando conta..." : "Criar conta"}
      </Button>

      <p className="text-center text-xs text-ink-muted sm:col-span-2">
        Ao criar a conta, você concorda com a Política de Privacidade e o tratamento dos seus dados
        conforme a LGPD.
      </p>

      <p className="text-center text-sm text-ink-soft sm:col-span-2">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

function formatCpf(value: string) { return value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); }
