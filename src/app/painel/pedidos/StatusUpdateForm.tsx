"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { ORDER_STATUSES } from "@/lib/validators";
import type { OrderStatusFormState } from "@/lib/actions/orders";

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

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
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Nota (opcional)</span>
        <input
          name="note"
          placeholder="Código de rastreio, observação..."
          className="h-11 rounded-xl border border-line px-4 text-sm focus:border-brand"
        />
        {state.fieldErrors?.note && (
          <span className="text-xs text-deal">{state.fieldErrors.note[0]}</span>
        )}
      </label>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Atualizar status"}
      </Button>
    </form>
  );
}
