import type { Metadata } from "next";
import { CookiePreferencesForm } from "@/components/CookiePreferences";
export const metadata: Metadata = { title: "Preferências de cookies (LGPD)" };
export default function Page() { return <div className="container-x max-w-5xl py-8 sm:py-12">
  <section className="rounded-[2rem] bg-gradient-to-br from-brand-dark via-brand to-indigo-500 px-6 py-10 text-white shadow-pop sm:px-10"><p className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">Privacidade · LGPD</p><h1 className="mt-3 font-display text-3xl font-semibold sm:text-5xl">Você controla suas preferências</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-white/85">Escolha quais recursos opcionais podem ser autorizados neste navegador. Sua decisão pode ser alterada a qualquer momento.</p></section>
  <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
    <section className="rounded-xl2 border border-line bg-paper p-6 shadow-card"><h2 className="font-display text-xl font-semibold">Como funciona</h2><p className="mt-3 text-sm leading-7 text-ink-muted">Cookies e armazenamento local guardam pequenas informações no navegador. Os recursos essenciais mantêm a sessão, o carrinho, a segurança e suas escolhas. Categorias opcionais permanecem desativadas até sua autorização.</p><div className="mt-5 rounded-xl bg-brand-soft p-4 text-sm leading-6 text-brand-dark">Atualmente, esta preferência registra sua escolha e prepara o controle para integrações futuras. Ela não ativa por si só uma ferramenta de análise ou publicidade.</div><p className="mt-4 text-xs leading-5 text-ink-muted">A escolha é salva apenas neste navegador. Ao limpar os dados do site ou usar outro aparelho, a Voltaria poderá perguntar novamente.</p></section>
    <section className="rounded-xl2 border border-line bg-mist p-5 shadow-card sm:p-6"><h2 className="mb-4 font-display text-xl font-semibold">Configurar agora</h2><CookiePreferencesForm /></section>
  </div>
</div>; }
