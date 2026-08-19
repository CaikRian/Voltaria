"use client";

import { useEffect, useRef, useState } from "react";
import { sendChatVisitorMessageAction } from "@/lib/actions/chat";
import { useChatAction } from "./useChatAction";

type Message = { id: string; senderRole: string; text: string; createdAt: string };

export function LiveChatThread({ sessionId, visitorId }: { sessionId: string; visitorId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [closed, setClosed] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { pending, timedOut, submit, clearTimedOut } = useChatAction((formData) => sendChatVisitorMessageAction(sessionId, visitorId, {}, formData));

  // Poll a cada 5s (mesmo padrão do OrderMessageThread pós-compra) — aqui o
  // widget não tem Server Component pra dar router.refresh(), então já vem com
  // a lista completa de mensagens a cada rodada. Isso também cobre o caso do
  // envio ter demorado/travado: a próxima rodada de poll traz a mensagem mesmo
  // que a resposta da action nunca volte pro client.
  useEffect(() => {
    let active = true;
    async function sync() {
      try {
        const res = await fetch(`/api/chat/sessoes/${sessionId}/mensagens?visitorId=${encodeURIComponent(visitorId)}`, { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = await res.json();
        setMessages(data.messages ?? []);
        setClosed(!!data.closed);
        setQueuePosition(typeof data.queuePosition === "number" ? data.queuePosition : null);
      } catch { /* mantém funcionando mesmo com uma consulta temporariamente indisponível */ }
    }
    sync();
    const timer = window.setInterval(sync, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [sessionId, visitorId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    submit(formData, (result) => {
      if (result.error) setError(result.error);
      else formRef.current?.reset();
    });
  }

  return (
    <div className="flex h-full flex-col">
      {queuePosition !== null && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900">
          <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-amber-400 text-[11px] font-black text-amber-950">{queuePosition}</span>
          {queuePosition === 1 ? "Você é o próximo! Um atendente já vai te chamar." : `Você está na fila — posição ${queuePosition}`}
        </div>
      )}
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-xs text-ink-muted">
            {queuePosition !== null ? "Assim que chegar sua vez, a conversa continua aqui." : "Recebemos seu pedido — um atendente vai te responder aqui em breve."}
          </p>
        )}
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
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-1 border-t border-line p-3">
          {error && <p className="text-xs text-deal">{error}</p>}
          {timedOut && (
            <p className="text-xs text-amber-800">
              Demorou mais que o esperado, mas pode já ter chegado — confira acima. <button type="button" onClick={clearTimedOut} className="font-bold underline">Ok</button>
            </p>
          )}
          <div className="flex gap-2">
            <input name="text" required placeholder="Escreva sua mensagem..." className="h-10 flex-1 rounded-xl border border-line bg-mist px-3 text-sm outline-none focus:border-brand focus:bg-white" />
            <button type="submit" disabled={pending} className="h-10 rounded-xl bg-brand px-4 text-sm font-bold text-white disabled:opacity-60">Enviar</button>
          </div>
        </form>
      )}
    </div>
  );
}
