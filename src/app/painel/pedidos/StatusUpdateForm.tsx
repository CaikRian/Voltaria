"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { ALLOWED_STATUS_TRANSITIONS, STATUS_META, type OrderStatus } from "@/lib/order-status";
import type { OrderStatusFormState } from "@/lib/actions/orders";

type Props = {
  action: (state: OrderStatusFormState, formData: FormData) => Promise<OrderStatusFormState>;
  currentStatus: string;
};

export function StatusUpdateForm({ action, currentStatus }: Props) {
  const [state, formAction, pending] = useActionState<OrderStatusFormState, FormData>(action, {});

  return (
    // key={currentStatus}: quando a atualização muda o status de verdade, o Server
    // Component pai revalida e manda um `currentStatus` novo — remontar o form aqui
    // garante que o <select defaultValue> reflita o status atual (não o de quando a
    // página abriu; sem isso, o dropdown voltava pro valor antigo depois de salvar).
    <form key={currentStatus} action={formAction} className="flex flex-col gap-3">
      {state.error && (
        <p className="rounded-lg bg-deal/10 px-3 py-2 text-sm text-deal">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-ok/10 px-3 py-2 text-sm text-ok">Status atualizado.</p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Status</span>
        <select
          name="status"
          defaultValue={currentStatus}
          className="h-11 rounded-xl border border-line px-3 text-sm focus:border-brand"
        >
          {/* Só o status atual + as transições permitidas a partir dele — nunca
              qualquer um dos 9, pra não deixar pular etapa pelo dropdown. */}
          <option value={currentStatus}>
            {STATUS_META[currentStatus as OrderStatus]?.label ?? currentStatus}
          </option>
          {(ALLOWED_STATUS_TRANSITIONS[currentStatus as OrderStatus] ?? []).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Nota (opcional)</span>
        <input
          name="note"
          placeholder="Observação sobre esta atualização..."
          className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand"
        />
        {state.fieldErrors?.note && (
          <span className="text-xs text-deal">{state.fieldErrors.note[0]}</span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Código de rastreio (opcional)</span>
        <input
          name="trackingCode"
          placeholder="Ex.: AA123456789BR"
          className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand"
        />
        {state.fieldErrors?.trackingCode && (
          <span className="text-xs text-deal">{state.fieldErrors.trackingCode[0]}</span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Link de rastreio (opcional)</span>
        <input
          name="trackingUrl"
          placeholder="Deixe em branco pra usar o link dos Correios automaticamente"
          className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand"
        />
        {state.fieldErrors?.trackingUrl && (
          <span className="text-xs text-deal">{state.fieldErrors.trackingUrl[0]}</span>
        )}
      </label>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Atualizar status"}
      </Button>
    </form>
  );
}
