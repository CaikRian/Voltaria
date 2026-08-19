"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendChatVisitorMessageAction, type ChatMessageState } from "@/lib/actions/chat";

type Message = { id: string; senderRole: string; text: string; createdAt: string };

const initial: ChatMessageState = {};

export function LiveChatThread({ sessionId, visitorId }: { sessionId: string; visitorId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [closed, setClosed] = useState(false);
  const action = sendChatVisitorMessageAction.bind(null, sessionId, visitorId);
  const [state, formAction, pending] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Poll a cada 5s (mesmo padrão do OrderMessageThread pós-compra) — aqui o
  // widget não tem Server Component pra dar router.refresh(), então já vem com
  // a lista completa de mensagens a cada rodada.
  useEffect(() => {
    let active = true;
    async function sync() {
      try {
        const res = await fetch(`/api/chat/sessoes/${sessionId}/mensagens?visitorId=${encodeURIComponent(visitorId)}`, { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = await res.json();
        setMessages(data.messages ?? []);
        setClosed(!!data.closed);
      } catch { /* mantém funcionando mesmo com uma consulta temporariamente indisponível */ }
    }
    sync();
    const timer = window.setInterval(sync, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [sessionId, visitorId]);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && <p className="text-center text-xs text-ink-muted">Recebemos seu pedido — um atendente vai te responder aqui em breve.</p>}
        {messages.map((message) => {
          const isVisitor = message.senderRole === "VISITANTE";
          return (
            <div key={message.id} className={`flex ${isVisitor ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl border p-2.5 text-sm shadow-sm ${isVisitor ? "rounded-br-md border-brand/30 bg-brand text-white" : "rounded-bl-md border-line bg-white text-ink"}`}>
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          );
        })}
        {closed && <p className="text-center text-xs text-ink-muted">Conversa encerrada pela equipe.</p>}
      </div>
      {!closed && (
        <form ref={formRef} action={formAction} className="flex gap-2 border-t border-line p-3">
          {state.error && <p className="w-full text-xs text-deal">{state.error}</p>}
          <input name="text" required placeholder="Escreva sua mensagem..." className="h-10 flex-1 rounded-xl border border-line bg-mist px-3 text-sm outline-none focus:border-brand focus:bg-white" />
          <button type="submit" disabled={pending} className="h-10 rounded-xl bg-brand px-4 text-sm font-bold text-white disabled:opacity-60">Enviar</button>
        </form>
      )}
    </div>
  );
}
