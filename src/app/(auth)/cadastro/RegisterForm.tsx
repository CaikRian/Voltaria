"use client";

import Link from "next/link";
import { useActionState } from "react";
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

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-lg bg-deal/10 px-3 py-2 text-sm text-deal">{state.error}</p>
      )}

      <label className="flex flex-col gap-1.5">
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
          type="password"
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
          type="password"
          autoComplete="new-password"
          required
          className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand"
          placeholder="Repita a senha"
        />
        <FieldError errors={fe.confirm} />
      </label>

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? "Criando conta..." : "Criar conta"}
      </Button>

      <p className="text-center text-xs text-ink-muted">
        Ao criar a conta, você concorda com a Política de Privacidade e o tratamento dos seus dados
        conforme a LGPD.
      </p>

      <p className="text-center text-sm text-ink-soft">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
