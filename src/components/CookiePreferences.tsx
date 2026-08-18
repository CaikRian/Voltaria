"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export const COOKIE_PREFERENCES_KEY = "voltaria-cookie-preferences-v1";
type Preferences = { necessary: true; analytics: boolean; marketing: boolean; updatedAt: string };

export function saveCookiePreferences(analytics: boolean, marketing: boolean) {
  const value: Preferences = { necessary: true, analytics, marketing, updatedAt: new Date().toISOString() };
  localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("voltaria:cookie-preferences", { detail: value }));
}

function Toggle({ checked, onChange, disabled, label, description }: { checked: boolean; onChange?: (value: boolean) => void; disabled?: boolean; label: string; description: string }) {
  return <label className="flex cursor-pointer items-start justify-between gap-5 rounded-xl border border-line bg-paper p-4">
    <span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs leading-5 text-ink-muted">{description}</span></span>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange?.(event.target.checked)} className="mt-1 h-5 w-5 accent-brand" />
  </label>;
}

export function CookiePreferencesForm() {
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const current = JSON.parse(localStorage.getItem(COOKIE_PREFERENCES_KEY) ?? "null") as Preferences | null;
      if (current) { setAnalytics(!!current.analytics); setMarketing(!!current.marketing); }
    } catch { localStorage.removeItem(COOKIE_PREFERENCES_KEY); }
  }, []);

  function save() { saveCookiePreferences(analytics, marketing); setSaved(true); }

  return <div className="space-y-3">
    <Toggle checked disabled label="Cookies necessários" description="Mantêm login, carrinho, segurança e funções essenciais. Não podem ser desligados." />
    <Toggle checked={analytics} onChange={(value) => { setAnalytics(value); setSaved(false); }} label="Medição e desempenho" description="Autoriza métricas de uso caso a loja adote uma ferramenta de análise." />
    <Toggle checked={marketing} onChange={(value) => { setMarketing(value); setSaved(false); }} label="Marketing personalizado" description="Autoriza personalização publicitária caso esse recurso seja adotado." />
    <button onClick={save} className="mt-2 inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark">Salvar preferências</button>
    {saved && <p role="status" className="text-sm font-medium text-emerald-700">Preferências salvas neste navegador.</p>}
  </div>;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(!localStorage.getItem(COOKIE_PREFERENCES_KEY)); }, []);
  if (!visible) return null;
  const choose = (analytics: boolean, marketing: boolean) => { saveCookiePreferences(analytics, marketing); setVisible(false); };
  return <aside aria-label="Preferências de cookies" className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-4xl rounded-2xl border border-line bg-paper p-5 shadow-pop sm:p-6">
    <div className="flex flex-col gap-5 md:flex-row md:items-center">
      <div className="flex-1"><p className="font-display text-lg font-semibold">Sua privacidade, suas escolhas</p><p className="mt-1 text-sm leading-6 text-ink-muted">Usamos armazenamento essencial para o site funcionar. Recursos opcionais só serão autorizados por você. <Link href="/legal/cookies" className="font-semibold text-brand hover:underline">Entenda e personalize</Link>.</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={() => choose(false, false)} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold hover:bg-mist">Somente necessários</button><button onClick={() => choose(true, true)} className="h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark">Aceitar todos</button></div>
    </div>
  </aside>;
}
