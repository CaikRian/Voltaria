"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type FormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const initial: FormState = {};

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <div className="flex flex-col gap-5">
      {googleEnabled && (
        <>
          <a
            href="/api/auth/signin/google"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-medium hover:bg-mist"
          >
            <span className="font-semibold text-brand">G</span> Entrar com Google
          </a>
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form action={action} className="flex flex-col gap-4">
        {state.error && (
          <p className="rounded-lg bg-deal/10 px-3 py-2 text-sm text-deal">{state.error}</p>
        )}

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
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Senha</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand"
            placeholder="••••••••"
          />
        </label>

        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-soft">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-brand hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
