import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container-x grid place-items-center py-24 text-center">
      <div>
        <p className="font-display text-6xl font-bold text-brand">404</p>
        <h1 className="mt-4 font-display text-2xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-ink-soft">O que você procura pode ter saído de estoque.</p>
        <ButtonLink href="/" className="mt-6">Voltar para a loja</ButtonLink>
      </div>
    </div>
  );
}
