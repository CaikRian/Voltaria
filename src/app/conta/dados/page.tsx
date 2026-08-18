import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { getAddressesByUser } from "@/lib/addresses";
import { AddressList } from "./AddressList";

export const metadata: Metadata = { title: "Meus endereços · Minha conta" };

export default async function ContaDadosPage() {
  const user = await requireUser();
  const addresses = await getAddressesByUser(user.id);

  return (
    <div className="container-x py-10">
      <Link href="/conta" className="text-sm text-brand hover:underline">
        ← Voltar para minha conta
      </Link>
      <h1 className="mb-1 mt-1 font-display text-2xl font-semibold">Meus endereços</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Gerencie seus endereços de entrega. Edição de nome e e-mail da conta chega em uma etapa futura.
      </p>

      {addresses.length === 0 ? (
        <p className="mb-4 text-sm text-ink-muted">Você ainda não tem nenhum endereço salvo.</p>
      ) : null}

      <AddressList addresses={addresses} />
    </div>
  );
}
