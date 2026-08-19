"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Event = { id: string; title: string; description: string | null; needsAttention: boolean; occurredAt: Date | string; providerStatus: string | null };

export function ShippingTrackingTimeline({ events, trackingCode, trackingUrl, needsAttention = false }: { events: Event[]; trackingCode?: string | null; trackingUrl?: string | null; needsAttention?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [router]);
  if (!events.length && !trackingCode) return null;
  return <section className={`rounded-xl2 border p-5 shadow-card ${needsAttention ? "border-amber-300 bg-amber-50" : "border-line bg-paper"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-display text-lg font-semibold">Rastreamento detalhado</p><p className="text-xs text-ink-muted">Atualizações recebidas diretamente do Melhor Envio.</p></div>{needsAttention && <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-900">Requer atenção</span>}</div>
    {trackingCode && <div className="mt-3 rounded-xl bg-white/70 p-3 text-sm"><span className="text-xs text-ink-muted">Código de rastreio</span><p className="font-mono font-bold">{trackingCode}</p>{trackingUrl && <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-bold text-brand hover:underline">Abrir rastreamento da transportadora ↗</a>}</div>}
    <ol className="relative mt-5 ml-2 border-l-2 border-line pl-6">{events.map((event, index) => <li key={event.id} className="relative pb-5 last:pb-0"><span className={`absolute -left-[1.95rem] top-0 h-3.5 w-3.5 rounded-full ring-4 ring-white ${event.needsAttention ? "bg-amber-500" : index === events.length - 1 ? "bg-brand" : "bg-slate-300"}`} /><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-bold">{event.title}</p><time className="text-xs text-ink-muted">{new Date(event.occurredAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</time></div>{event.description && <p className="mt-1 text-xs text-ink-soft">{event.description}</p>}</li>)}</ol>
  </section>;
}
