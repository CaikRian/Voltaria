"use client";

import { useRef, useState } from "react";
import { startChatEscalationAction, type ChatEscalationState } from "@/lib/actions/chat";
import { CHAT_REASONS } from "@/lib/validators";
import { useChatAction } from "./useChatAction";

export function EscalationForm({
  visitorId,
  defaultName,
  defaultEmail,
  onStarted,
  onCancel,
}: {
  visitorId: string;
  defaultName: string;
  defaultEmail: string;
  onStarted: (sessionId: string) => void;
  onCancel: () => void;
}) {
  const [result, setResult] = useState<ChatEscalationState>({});
  const formRef = useRef<HTMLFormElement>(null);
  const { pending, timedOut, submit, clearTimedOut } = useChatAction((formData) => startChatEscalationAction({}, formData));

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setResult({});
    submit(formData, (r) => {
      if (r.sessionId) onStarted(r.sessionId);
      else setResult(r);
    });
  }

  function retry() {
    clearTimedOut();
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
      <p className="text-sm text-ink-soft">
        Antes de te colocar com um atendente, me conta rapidinho o que você precisa —
        assim quem te atender já chega sabendo o contexto.
      </p>

      {result.error && <p className="rounded-lg bg-deal/10 px-3 py-2 text-xs text-deal">{result.error}</p>}
      {timedOut && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Isso está demorando mais que o esperado. Pode tentar de novo.
          <button type="button" onClick={retry} className="ml-2 font-bold underline">Tentar de novo</button>
        </div>
      )}

      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Seu nome
        <input name="name" defaultValue={defaultName} className="h-10 rounded-xl border border-line bg-mist px-3 text-sm outline-none focus:border-brand focus:bg-white" />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Seu e-mail
        <input name="email" type="email" required defaultValue={defaultEmail} className="h-10 rounded-xl border border-line bg-mist px-3 text-sm outline-none focus:border-brand focus:bg-white" />
        {result.fieldErrors?.email && <span className="text-deal">{result.fieldErrors.email[0]}</span>}
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Motivo
        <select name="reason" required defaultValue="" className="h-10 rounded-xl border border-line bg-mist px-3 text-sm outline-none focus:border-brand focus:bg-white">
          <option value="" disabled>Escolha um motivo</option>
          {CHAT_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
        </select>
        {result.fieldErrors?.reason && <span className="text-deal">{result.fieldErrors.reason[0]}</span>}
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Número do pedido (se for sobre um pedido)
        <input name="orderRef" placeholder="Opcional" className="h-10 rounded-xl border border-line bg-mist px-3 text-sm outline-none focus:border-brand focus:bg-white" />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Como posso te ajudar?
        <textarea name="message" required rows={3} placeholder="Conte o que você precisa..." className="rounded-xl border border-line bg-mist px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white" />
        {result.fieldErrors?.message && <span className="text-deal">{result.fieldErrors.message[0]}</span>}
      </label>

      <input type="hidden" name="visitorId" value={visitorId} />

      <div className="mt-1 flex gap-2">
        <button type="button" onClick={onCancel} className="h-10 flex-1 rounded-xl border border-line text-sm font-semibold text-ink-soft hover:bg-mist">Voltar</button>
        <button type="submit" disabled={pending} className="h-10 flex-1 rounded-xl bg-brand text-sm font-bold text-white shadow-card hover:bg-brand-dark disabled:opacity-60">
          {pending ? "Enviando..." : "Falar com atendente"}
        </button>
      </div>
    </form>
  );
}
