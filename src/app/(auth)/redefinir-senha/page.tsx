import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Redefinir senha" };
type SearchParams = Promise<{ token?: string }>;
export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) { const { token } = await searchParams; return <div><p className="text-xs font-black uppercase tracking-[.18em] text-brand">Segurança</p><h1 className="mt-1 font-display text-2xl font-bold">Crie uma nova senha</h1><p className="mb-6 mt-2 text-sm text-ink-soft">Use uma combinação segura que você ainda não utiliza em outros sites.</p>{token ? <ResetPasswordForm token={token} /> : <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Link de recuperação inválido. <Link href="/recuperar-conta" className="font-bold underline">Solicitar outro link</Link></div>}</div>; }
