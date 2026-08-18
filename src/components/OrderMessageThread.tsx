"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { sendOrderMessageAction, sendOrderReplyAction } from "@/lib/actions/orders";

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

export function OrderMessageThread({ orderId, mode, messages }: Props) {
  const action =
    mode === "customer"
      ? sendOrderMessageAction.bind(null, orderId)
      : sendOrderReplyAction.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <div className="rounded-xl2 border border-line bg-paper p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Chat interno do pedido</p>
        <span className="text-xs text-ink-muted">
          {messages.length} {messages.length === 1 ? "mensagem" : "mensagens"}
        </span>
      </div>

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
