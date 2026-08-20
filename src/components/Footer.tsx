import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-paper">
      <div className="container-x grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white font-display font-bold">
              H
            </span>
            <span className="font-display text-lg font-semibold">Heca Store</span>
          </div>
          <p className="mt-3 text-sm text-ink-muted">
            Tecnologia e produtos para facilitar sua rotina, com uma experiência de compra clara e segura.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Institucional</h3>
          <ul className="flex flex-col gap-2 text-sm text-ink-soft">
            <li><Link href="/sobre" className="hover:text-brand">Sobre nós</Link></li>
            <li><Link href="/contato" className="hover:text-brand">Contato</Link></li>
            <li><Link href="/trabalhe-conosco" className="hover:text-brand">Trabalhe conosco</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Ajuda</h3>
          <ul className="flex flex-col gap-2 text-sm text-ink-soft">
            <li><Link href="/ajuda/trocas-e-devolucoes" className="hover:text-brand">Trocas e devoluções</Link></li>
            <li><Link href="/ajuda/rastrear-pedido" className="hover:text-brand">Rastrear pedido</Link></li>
            <li><Link href="/ajuda/formas-de-pagamento" className="hover:text-brand">Formas de pagamento</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Legal</h3>
          <ul className="flex flex-col gap-2 text-sm text-ink-soft">
            <li><Link href="/legal/privacidade" className="hover:text-brand">Política de Privacidade</Link></li>
            <li><Link href="/legal/termos" className="hover:text-brand">Termos de uso</Link></li>
            <li><Link href="/legal/cookies" className="hover:text-brand">Preferências de cookies (LGPD)</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-6 text-xs text-ink-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Heca Store. Todos os direitos reservados.</p>
          <a href="https://github.com/CaikRian" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-brand">Desenvolvido por Caik Rian · GitHub ↗</a>
        </div>
      </div>
    </footer>
  );
}
