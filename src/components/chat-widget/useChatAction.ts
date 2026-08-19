"use client";

import { useState, useTransition } from "react";

// useActionState() prende a UI em "pending" pra sempre se a resposta da server
// action nunca chegar de volta ao client (conexão caiu no meio, function travou
// no servidor etc.) — foi exatamente o bug relatado no fluxo de escalonamento.
// Isso aqui chama a action manualmente e corre contra um timeout, garantindo que
// o usuário sempre recupera o controle da UI, mesmo se o pedido nunca responder.
const TIMEOUT_MS = 15000;

export function useChatAction<TState>(action: (formData: FormData) => Promise<TState>) {
  const [pending, startTransition] = useTransition();
  const [timedOut, setTimedOut] = useState(false);

  function submit(formData: FormData, onResult: (result: TState) => void) {
    setTimedOut(false);
    startTransition(async () => {
      const timeout = new Promise<"timeout">((resolve) => { setTimeout(() => resolve("timeout"), TIMEOUT_MS); });
      const result = await Promise.race([action(formData), timeout]);
      if (result === "timeout") { setTimedOut(true); return; }
      onResult(result);
    });
  }

  return { pending, timedOut, submit, clearTimedOut: () => setTimedOut(false) };
}
