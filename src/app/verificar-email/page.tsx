import type { Metadata } from "next";
import { VerifyEmailForm } from "./VerifyEmailForm";

export const metadata: Metadata = { title: "Confirmar e-mail" };

type SearchParams = Promise<{ email?: string; codigo?: string; enviado?: string }>;

export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return <main className="container-x py-14"><div className="mx-auto max-w-lg"><div className="rounded-xl2 border border-line bg-paper p-6 shadow-card sm:p-9"><p className="text-xs font-black uppercase tracking-[.18em] text-brand">Segurança da conta</p><h1 className="mt-2 font-display text-3xl font-bold">Confirme seu e-mail</h1><p className="mt-3 text-sm leading-6 text-ink-soft">Enviamos um código pela Brevo. Confira também as pastas Spam e Promoções.</p>{params.enviado === "0" && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">A conta foi criada, mas o primeiro envio falhou. Use “Enviar novo código” abaixo.</p>}<VerifyEmailForm initialEmail={params.email || ""} initialCode={params.codigo || ""} /></div></div></main>;
}
