import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { getAddressesByUser } from "@/lib/addresses";
import { getAccountOverview } from "@/lib/account";
import { AddressList } from "./AddressList";
import { PasswordForm, ProfileForm } from "./AccountSettings";

export const metadata: Metadata = { title: "Meus dados · Minha conta" };

export default async function ContaDadosPage() {
  const user = await requireUser();
  const [addresses, account] = await Promise.all([getAddressesByUser(user.id), getAccountOverview(user.id)]);
  if (!account) notFound();
  const hasPassword = !!account.passwordHash;

  return (
    <div className="container-x py-8 sm:py-10">
      <Link href="/conta" className="text-sm font-medium text-brand hover:underline">← Voltar para minha conta</Link>
      <div className="mt-3"><h1 className="font-display text-3xl font-semibold">Meus dados</h1><p className="mt-1 text-sm text-ink-muted">Gerencie suas informações pessoais, segurança e endereços.</p></div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card sm:p-6">
            <div className="mb-5"><p className="font-display text-lg font-semibold">Informações pessoais</p><p className="mt-1 text-sm text-ink-muted">Dados utilizados para identificar sua conta.</p></div>
            <ProfileForm name={account.name ?? ""} email={account.email} hasPassword={hasPassword} />
          </section>

          <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card sm:p-6">
            <div className="mb-5"><p className="font-display text-lg font-semibold">Segurança da conta</p><p className="mt-1 text-sm text-ink-muted">{hasPassword ? "Altere sua senha periodicamente para manter a conta segura." : "Crie uma senha para também poder entrar usando e-mail."}</p></div>
            <PasswordForm hasPassword={hasPassword} />
          </section>

          <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card sm:p-6">
            <div className="mb-5"><p className="font-display text-lg font-semibold">Endereços de entrega</p><p className="mt-1 text-sm text-ink-muted">Cadastre seus endereços e escolha qual será usado como padrão.</p></div>
            {addresses.length === 0 && <p className="mb-4 rounded-xl bg-mist px-4 py-3 text-sm text-ink-muted">Você ainda não possui um endereço salvo.</p>}
            <AddressList addresses={addresses} />
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl2 border border-line bg-gradient-to-br from-brand-soft to-paper p-5 shadow-card">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-xl font-bold text-white">{(account.name || account.email).charAt(0).toUpperCase()}</div>
            <p className="mt-4 font-semibold">{account.name || "Cliente Voltaria"}</p><p className="mt-0.5 break-all text-sm text-ink-muted">{account.email}</p>
            <p className="mt-4 text-xs text-ink-muted">Cliente desde {account.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", month: "long", year: "numeric" })}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat value={account._count.orders} label="Pedidos" /><Stat value={account._count.reviews} label="Avaliações" /><Stat value={account._count.addresses} label="Endereços" />
          </div>
          <div className="rounded-xl2 border border-line bg-paper p-5 text-sm shadow-card"><p className="font-semibold">Login conectado</p><p className="mt-2 text-ink-muted">{account.accounts.length > 0 ? account.accounts.map((item) => item.provider).join(", ") : "E-mail e senha"}</p><Link href="/conta/privacidade" className="mt-4 inline-block font-medium text-brand hover:underline">Privacidade e seus dados →</Link></div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="rounded-xl border border-line bg-paper p-3 text-center shadow-card"><p className="font-semibold">{value}</p><p className="mt-0.5 text-[10px] text-ink-muted">{label}</p></div>;
}
