"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendChatStaffMessageAction, closeChatSessionAction, type ChatMessageState } from "@/lib/actions/chat";

const initial: ChatMessageState = {};

export function StaffChatPanel({ sessionId, closed }: { sessionId: string; closed: boolean }) {
  const router = useRouter();
  const action = sendChatStaffMessageAction.bind(null, sessionId);
  const [state, formAction, pending] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const knownCount = useRef<number | null>(null);

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

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  if (closed) {
    return <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-ink-muted">Esta conversa foi encerrada.</p>;
  }

  return (
    <div className="space-y-3">
      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        {state.error && <p className="rounded-lg bg-deal/10 px-3 py-2 text-sm text-deal">{state.error}</p>}
        <textarea
          name="text"
          rows={3}
          required
          placeholder="Escreva sua resposta..."
          className="w-full rounded-xl border border-line bg-mist px-4 py-3 text-sm outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10"
        />
        {state.fieldErrors?.text && <p className="text-xs text-deal">{state.fieldErrors.text[0]}</p>}
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
