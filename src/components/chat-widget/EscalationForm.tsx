"use client";

import { useActionState, useEffect } from "react";
import { startChatEscalationAction, type ChatEscalationState } from "@/lib/actions/chat";
import { CHAT_REASONS } from "@/lib/validators";

const initial: ChatEscalationState = {};

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
  const [state, formAction, pending] = useActionState(startChatEscalationAction, initial);

  useEffect(() => {
    if (state.sessionId) onStarted(state.sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessionId]);

  return (
    <form action={formAction} className="flex flex-col gap-3 p-4">
      <input type="hidden" name="visitorId" value={visitorId} />
      <p className="text-sm text-ink-soft">
        Antes de te colocar com um atendente, me conta rapidinho o que você precisa —
        assim quem te atender já chega sabendo o contexto.
      </p>

      {state.error && <p className="rounded-lg bg-deal/10 px-3 py-2 text-xs text-deal">{state.error}</p>}

      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Seu nome
        <input name="name" defaultValue={defaultName} className="h-10 rounded-xl border border-line bg-mist px-3 text-sm outline-none focus:border-brand focus:bg-white" />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Seu e-mail
        <input name="email" type="email" required defaultValue={defaultEmail} className="h-10 rounded-xl border border-line bg-mist px-3 text-sm outline-none focus:border-brand focus:bg-white" />
        {state.fieldErrors?.email && <span className="text-deal">{state.fieldErrors.email[0]}</span>}
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Motivo
        <select name="reason" required defaultValue="" className="h-10 rounded-xl border border-line bg-mist px-3 text-sm outline-none focus:border-brand focus:bg-white">
          <option value="" disabled>Escolha um motivo</option>
          {CHAT_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
        </select>
        {state.fieldErrors?.reason && <span className="text-deal">{state.fieldErrors.reason[0]}</span>}
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Número do pedido (se for sobre um pedido)
        <input name="orderRef" placeholder="Opcional" className="h-10 rounded-xl border border-line bg-mist px-3 text-sm outline-none focus:border-brand focus:bg-white" />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Como posso te ajudar?
        <textarea name="message" required rows={3} placeholder="Conte o que você precisa..." className="rounded-xl border border-line bg-mist px-3 py-2 text-sm outline-none focus:border-brand focus:bg-white" />
        {state.fieldErrors?.message && <span className="text-deal">{state.fieldErrors.message[0]}</span>}
      </label>

      <div className="mt-1 flex gap-2">
        <button type="button" onClick={onCancel} className="h-10 flex-1 rounded-xl border border-line text-sm font-semibold text-ink-soft hover:bg-mist">Voltar</button>
        <button type="submit" disabled={pending} className="h-10 flex-1 rounded-xl bg-brand text-sm font-bold text-white shadow-card hover:bg-brand-dark disabled:opacity-60">
          {pending ? "Enviando..." : "Falar com atendente"}
        </button>
      </div>
    </form>
  );
}
