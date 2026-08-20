import Link from "next/link";

// Layout enxuto para telas de auth: cartão centralizado, sem distrações.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100vh-7rem)] overflow-hidden bg-gradient-to-br from-brand-soft/50 via-white to-indigo-50 py-8 sm:py-12"><div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-brand/10 blur-3xl" /><div className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />
      <div className="container-x relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl lg:grid-cols-[.85fr_1.15fr]">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-brand-dark to-brand p-8 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" /><Link href="/" className="relative flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white font-display text-lg font-black text-brand">H</span><span className="font-display text-xl font-bold">Heca Store</span></Link><div className="relative my-12"><p className="text-xs font-black uppercase tracking-[.2em] text-white/50">Sua experiência continua aqui</p><h2 className="mt-3 font-display text-3xl font-bold leading-tight">Compre com segurança e acompanhe tudo de perto.</h2><ul className="mt-7 space-y-3 text-sm text-white/75"><li className="flex gap-3"><span className="text-emerald-300">✓</span>Pedidos e rastreamento em um só lugar</li><li className="flex gap-3"><span className="text-emerald-300">✓</span>Pagamento protegido pelo Mercado Pago</li><li className="flex gap-3"><span className="text-emerald-300">✓</span>Atendimento direto com nossa equipe</li></ul></div><p className="relative text-xs text-white/45">Seus dados são tratados de acordo com a LGPD.</p></aside>
        <div className="p-5 sm:p-8 lg:p-10"><Link href="/" className="mb-7 flex items-center gap-2 lg:hidden"><span className="grid h-9 w-9 place-items-center rounded-lg bg-brand font-display font-bold text-white">H</span><span className="font-display text-xl font-semibold">Heca Store</span></Link>{children}</div>
      </div>
    </div>
  );
}
