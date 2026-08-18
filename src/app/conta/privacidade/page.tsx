import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { getAccountOverview } from "@/lib/account";
import { DeleteAccountForm } from "./DeleteAccountForm";

export const metadata: Metadata = { title: "Privacidade e LGPD · Minha conta" };

export default async function PrivacyPage() {
  const user = await requireUser();
  const account = await getAccountOverview(user.id);
  if (!account) notFound();

  return (
    <div className="container-x max-w-5xl py-8 sm:py-10">
      <Link href="/conta" className="text-sm font-medium text-brand hover:underline">← Voltar para minha conta</Link>
      <div className="mt-3"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Seus direitos</p><h1 className="mt-2 font-display text-3xl font-semibold">Privacidade e LGPD</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">Consulte, exporte ou solicite a exclusão das informações vinculadas à sua conta.</p></div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl2 border border-line bg-paper p-6 shadow-card">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft font-bold text-brand">↓</span>
          <h2 className="mt-4 font-display text-xl font-semibold">Baixar meus dados</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">Receba um arquivo JSON com perfil, endereços, pedidos, mensagens enviadas, avaliações e perguntas. Senhas, tokens e credenciais nunca são incluídos.</p>
          <a href="/api/conta/exportar" download className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark">Exportar meus dados</a>
        </section>

        <section className="rounded-xl2 border border-line bg-paper p-6 shadow-card">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 font-bold text-emerald-700">✓</span>
          <h2 className="mt-4 font-display text-xl font-semibold">Como tratamos seus dados</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-muted"><li>• Dados de contato viabilizam sua conta e atendimento.</li><li>• Endereços são utilizados para entrega dos pedidos.</li><li>• Informações de pagamento ficam no Mercado Pago; armazenamos apenas identificadores e status.</li><li>• Dados não são vendidos a terceiros.</li></ul>
        </section>
      </div>

      <section className="mt-6 rounded-xl2 border border-red-200 bg-red-50 p-6">
        <h2 className="font-display text-xl font-semibold text-red-900">Excluir minha conta</h2>
        <p className="mt-2 text-sm leading-6 text-red-800">Esta ação é permanente. Endereços, avaliações, perguntas e dados da conta serão removidos. Pedidos concluídos serão mantidos apenas com dados comerciais mínimos e sem vínculo pessoal, para obrigações legais e contábeis.</p>
        <p className="mt-2 text-sm font-medium text-red-900">Não é possível excluir a conta enquanto houver pedido em pagamento, preparação, transporte ou reembolso.</p>
        <DeleteAccountForm hasPassword={!!account.passwordHash} />
      </section>
    </div>
  );
}
