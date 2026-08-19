"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useChatWidget } from "@/store/chatWidget";
import { getChatVisitorId } from "./chatVisitor";
import { BotMenu } from "./BotMenu";
import { EscalationForm } from "./EscalationForm";
import { LiveChatThread } from "./LiveChatThread";

// Widget flutuante global (loja pública + área do cliente). Não aparece no
// painel — staff tem a própria central em /painel/chatbot.
export function ChatWidget() {
  const pathname = usePathname();
  const { data: authSession } = useSession();
  const { isOpen, sessionId, unread, close, toggle, setSession, clearSession, setUnread } = useChatWidget();
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [escalating, setEscalating] = useState(false);

  useEffect(() => { setVisitorId(getChatVisitorId()); }, []);

  // Indicador de não-lida com o widget fechado — só entra em ação quando já
  // existe uma conversa com atendente ativa; poll mais espaçado que o do chat
  // aberto (não é urgente descobrir isso em tempo real).
  useEffect(() => {
    if (isOpen || !sessionId || !visitorId) return;
    let active = true;
    async function check() {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch(`/api/chat/sessoes/${sessionId}/mensagens?visitorId=${encodeURIComponent(visitorId as string)}`, { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = await res.json();
        if (data.awaitingReplyFrom === "VISITANTE") setUnread(true);
      } catch { /* mantém funcionando mesmo com uma consulta temporariamente indisponível */ }
    }
    check();
    const timer = window.setInterval(check, 20000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isOpen, sessionId, visitorId, setUnread]);

  if (pathname?.startsWith("/painel") || !visitorId) return null;

  return (
    <>
      <button
        onClick={toggle}
        aria-label={isOpen ? "Fechar chat" : "Abrir chat"}
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-brand text-2xl text-white shadow-pop transition hover:bg-brand-dark"
      >
        {unread && !isOpen && <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-deal ring-2 ring-white" />}
        {isOpen ? "✕" : "💬"}
      </button>

      {isOpen && (
        <div role="dialog" aria-label="Chat com a Bia" className="fixed bottom-24 right-4 z-50 flex h-[min(70vh,600px)] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden rounded-[1.5rem] border border-line bg-paper shadow-pop">
          <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-brand-dark px-4 py-3 text-white">
            <div>
              <p className="font-display text-sm font-semibold">Bia</p>
              <p className="text-[11px] text-white/70">
                {sessionId ? `Protocolo #${sessionId.slice(-8).toUpperCase()}` : "Assistente virtual · Heca - Store"}
              </p>
            </div>
            <button onClick={close} aria-label="Fechar chat" className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white/10">✕</button>
          </div>
          <div className="flex-1 overflow-hidden">
            {sessionId ? (
              <LiveChatThread sessionId={sessionId} visitorId={visitorId} onExit={clearSession} />
            ) : escalating ? (
              <EscalationForm
                visitorId={visitorId}
                defaultName={authSession?.user?.name ?? ""}
                defaultEmail={authSession?.user?.email ?? ""}
                onStarted={(id) => { setSession(id); setEscalating(false); }}
                onCancel={() => setEscalating(false)}
              />
            ) : (
              <BotMenu loggedIn={!!authSession?.user} onEscalate={() => setEscalating(true)} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
