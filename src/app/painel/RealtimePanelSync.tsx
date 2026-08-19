"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Kind = "order" | "message" | "question" | "review" | "chatbot";
type Toast = { id: string; kind: Kind; title: string; text: string };
type Activity = { latest: Record<Kind, ({ id: string; product?: string; rating?: number; orderId?: string }) | null>; version: string | null };
const labels: Record<Kind, { title: string; icon: string }> = {
  order: { title: "Nova compra recebida!", icon: "✓" }, message: { title: "Cliente respondeu no chat", icon: "✦" }, question: { title: "Nova dúvida sobre produto", icon: "?" }, review: { title: "Nova avaliação publicada", icon: "★" }, chatbot: { title: "Novo atendimento no chat-bot", icon: "☎" },
};

export function RealtimePanelSync() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const baseline = useRef<Record<string, string | null> | null>(null);
  const version = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    async function check() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/painel/atividade", { cache: "no-store" });
        if (!response.ok || !active) return;
        const data = await response.json() as Activity;
        const current = Object.fromEntries((Object.keys(labels) as Kind[]).map((kind) => [kind, data.latest[kind]?.id ?? null]));
        if (baseline.current) {
          const news = (Object.keys(labels) as Kind[]).filter((kind) => current[kind] && current[kind] !== baseline.current?.[kind]);
          if (news.length) {
            setToasts((old) => [...news.map((kind) => ({ id: `${kind}-${current[kind]}`, kind, title: labels[kind].title, text: data.latest[kind]?.product ?? (kind === "message" ? "Abra Conversas para responder." : "O painel já foi atualizado.") })), ...old].slice(0, 4));
            router.refresh();
          }
          if (!news.length && version.current && data.version !== version.current) router.refresh();
        }
        baseline.current = current;
        version.current = data.version;
      } catch { /* mantém o painel funcionando mesmo com uma consulta temporariamente indisponível */ }
    }
    check();
    const timer = window.setInterval(check, 6000);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [router]);

  return <div aria-live="polite" className="pointer-events-none fixed right-3 top-24 z-[80] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-3">
    {toasts.map((toast) => <div key={toast.id} className="pointer-events-auto overflow-hidden rounded-2xl border border-brand/20 bg-paper shadow-pop motion-safe:animate-[toast-in_.35s_ease-out]"><div className="h-1 bg-gradient-to-r from-brand to-indigo-500" /><div className="flex gap-3 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-lg font-bold text-white">{labels[toast.kind].icon}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{toast.title}</p><p className="mt-1 truncate text-xs text-ink-muted">{toast.text}</p></div><button onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))} aria-label="Fechar aviso" className="h-7 w-7 rounded-lg text-ink-muted hover:bg-mist">×</button></div></div>)}
  </div>;
}
