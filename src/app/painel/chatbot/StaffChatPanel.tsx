"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendChatStaffMessageAction, closeChatSessionAction } from "@/lib/actions/chat";
import { useChatAction } from "@/components/chat-widget/useChatAction";

export function StaffChatPanel({ sessionId, closed }: { sessionId: string; closed: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const knownCount = useRef<number | null>(null);
  const { pending, timedOut, submit, clearTimedOut } = useChatAction((formData) => sendChatStaffMessageAction(sessionId, {}, formData));

  // Mesmo padrão de polling do OrderMessageThread — o toast/refresh global do
  // RealtimePanelSync já pega mudança em qualquer sessão, isso aqui é só pra
  // atualizar mais rápido enquanto o vendedor está com essa conversa aberta.
  useEffect(() => {
    let active = true;
    async function sync() {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch(`/api/chat/sessoes/${sessionId}/mensagens`, { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = await res.json();
        if (knownCount.current !== null && data.count !== knownCount.current) router.refresh();
        knownCount.current = data.count;
      } catch { /* mantém funcionando mesmo com uma consulta temporariamente indisponível */ }
    }
    sync();
    const timer = window.setInterval(sync, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [sessionId, router]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    submit(formData, (result) => {
      if (result.error) { setError(result.error); return; }
      formRef.current?.reset();
      router.refresh();
    });
  }

  if (closed) {
    return <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-ink-muted">Esta conversa foi encerrada.</p>;
  }

  return (
    <div className="space-y-3">
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2">
        {error && <p className="rounded-lg bg-deal/10 px-3 py-2 text-sm text-deal">{error}</p>}
        {timedOut && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Demorou mais que o esperado, mas pode já ter chegado — dê um refresh pra conferir. <button type="button" onClick={clearTimedOut} className="font-bold underline">Ok</button>
          </p>
        )}
        <textarea
          name="text"
          rows={3}
          required
          placeholder="Escreva sua resposta..."
          className="w-full rounded-xl border border-line bg-mist px-4 py-3 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
        />
        <button type="submit" disabled={pending} className="ml-auto rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-dark disabled:opacity-60">
          {pending ? "Enviando..." : "Responder"}
        </button>
      </form>
      <form action={closeChatSessionAction.bind(null, sessionId)}>
        <button type="submit" className="text-xs font-semibold text-ink-muted hover:text-deal hover:underline">Encerrar conversa</button>
      </form>
    </div>
  );
}
