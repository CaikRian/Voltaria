import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-paper">
      <div className="container-x grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white font-display font-bold">
              V
            </span>
            <span className="font-display text-lg font-semibold">Voltaria</span>
          </div>
          <p className="mt-3 text-sm text-ink-muted">
            Eletrônicos e produtos gerais com entrega para todo o Brasil.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Institucional</h3>
          <ul className="flex flex-col gap-2 text-sm text-ink-soft">
            <li><Link href="#" className="hover:text-brand">Sobre nós</Link></li>
            <li><Link href="#" className="hover:text-brand">Contato</Link></li>
            <li><Link href="#" className="hover:text-brand">Trabalhe conosco</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Ajuda</h3>
          <ul className="flex flex-col gap-2 text-sm text-ink-soft">
            <li><Link href="#" className="hover:text-brand">Trocas e devoluções</Link></li>
            <li><Link href="#" className="hover:text-brand">Rastrear pedido</Link></li>
            <li><Link href="#" className="hover:text-brand">Formas de pagamento</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Legal</h3>
          <ul className="flex flex-col gap-2 text-sm text-ink-soft">
            <li><Link href="#" className="hover:text-brand">Política de Privacidade</Link></li>
            <li><Link href="#" className="hover:text-brand">Termos de uso</Link></li>
            <li><Link href="#" className="hover:text-brand">Preferências de cookies (LGPD)</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-6 text-xs text-ink-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Voltaria. Todos os direitos reservados.</p>
          <p>CNPJ 00.000.000/0001-00</p>
        </div>
      </div>
    </footer>
  );
}
