"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { sendOrderMessageAction, sendOrderReplyAction, closeOrderChatAction } from "@/lib/actions/orders";

type MessageUser = {
  name?: string | null;
  email?: string | null;
};

type Message = {
  id: string;
  text: string;
  senderRole: string;
  createdAt: Date;
  user?: MessageUser | null;
};

type Props = {
  orderId: string;
  mode: "customer" | "staff";
  messages: Message[];
  closed?: boolean;
};

const formatSender = (role: string) => {
  switch (role) {
    case "CLIENTE":
      return "Cliente";
    case "VENDEDOR":
      return "Vendedor";
    case "GERENTE":
      return "Gerente";
    case "ADMIN":
      return "Admin";
    default:
      return "Equipe";
  }
};

export function OrderMessageThread({ orderId, mode, messages, closed = false }: Props) {
  const router = useRouter();
  const latestId = messages.at(-1)?.id ?? null;
  const knownLatest = useRef<string | null>(latestId);
  const [liveNotice, setLiveNotice] = useState(false);
  const action =
    mode === "customer"
      ? sendOrderMessageAction.bind(null, orderId)
      : sendOrderReplyAction.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, {});
  const [closeState, closeAction, closePending] = useActionState(
    closeOrderChatAction.bind(null, orderId),
    {}
  );

  useEffect(() => { knownLatest.current = latestId; }, [latestId]);
  useEffect(() => {
    let active = true;
    async function syncMessages() {
      if (document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`/api/pedidos/${orderId}/mensagens`, { cache: "no-store" });
        if (!response.ok || !active) return;
        const data = await response.json() as { last: { id: string } | null };
        if (data.last?.id && knownLatest.current && data.last.id !== knownLatest.current) {
          knownLatest.current = data.last.id;
          setLiveNotice(true);
          router.refresh();
        }
      } catch { /* uma falha momentânea não interrompe o chat */ }
    }
    const timer = window.setInterval(syncMessages, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [orderId, router]);

  return (
    <div className="rounded-xl2 border border-line bg-paper p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Chat interno do pedido</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-muted">
            {messages.length} {messages.length === 1 ? "mensagem" : "mensagens"}
          </span>
          {mode === "staff" && !closed && (
            <form action={closeAction}>
              <button
                type="submit"
                disabled={closePending}
                className="text-xs font-medium text-ink-muted hover:text-red-600 hover:underline"
              >
                {closePending ? "Fechando..." : "Fechar conversa"}
              </button>
            </form>
          )}
        </div>
      </div>

      {liveNotice && <button type="button" onClick={() => setLiveNotice(false)} className="mb-3 flex w-full items-center justify-between rounded-xl border border-brand/20 bg-brand-soft px-3 py-2 text-left text-xs font-semibold text-brand-dark"><span><span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-brand" />Nova mensagem recebida automaticamente</span><span>×</span></button>}

      {closeState.error && <p className="mb-3 text-xs text-red-600">{closeState.error}</p>}

      {closed && (
        <p className="mb-3 rounded-xl border border-line bg-mist px-3 py-2 text-xs text-ink-muted">
          Esta conversa foi encerrada{mode === "staff" ? " (manualmente ou por 3 dias sem resposta do cliente)" : ""}.
          Enviar uma nova mensagem reabre o chat automaticamente.
        </p>
      )}

      <div className="mb-4 flex max-h-80 flex-col gap-3 overflow-y-auto rounded-xl border border-line bg-mist p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-muted">Ainda não há mensagens nesta compra.</p>
        ) : (
          messages.map((message) => {
            const isClient = message.senderRole === "CLIENTE";
            return (
              <div
                key={message.id}
                className={`flex ${isClient ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl border p-3 text-sm shadow-sm ${
                    isClient
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-brand/30 bg-brand text-white"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <strong className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${isClient ? "text-amber-700" : "text-white/80"}`}>
                      {formatSender(message.senderRole)}
                    </strong>
                    <span className={`text-[10px] ${isClient ? "text-amber-700/80" : "text-white/70"}`}>
                      {new Date(message.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        {state.success && (
          <p className="text-xs text-green-600">Mensagem enviada com sucesso.</p>
        )}
        {state.fieldErrors?.text && (
          <p className="text-xs text-red-600">{state.fieldErrors.text[0]}</p>
        )}
        <textarea
          name="text"
          rows={3}
          placeholder={
            mode === "customer"
              ? "Escreva uma mensagem para a equipe sobre seu pedido..."
              : "Responder ao cliente sobre o pedido..."
          }
          className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? mode === "customer"
              ? "Enviando..."
              : "Respondendo..."
            : mode === "customer"
              ? "Enviar mensagem"
              : "Responder no chat"}
        </Button>
      </form>
    </div>
  );
}
