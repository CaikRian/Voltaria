"use client";

import { useState } from "react";
import { updateOrderAddressAction } from "@/lib/actions/orders";
import { Button } from "@/components/ui/Button";

type UpdateAddressState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string[]>;
};

export function OrderAddressEditor({
  orderId,
  initialAddress,
  status,
}: {
  orderId: string;
  initialAddress: {
    name: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
  };
  status: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, setState] = useState<UpdateAddressState>({});

  // Só permite editar se estiver AGUARDANDO_PAGAMENTO ou PAGAMENTO_APROVADO
  const canEdit =
    ["AGUARDANDO_PAGAMENTO", "PAGAMENTO_APROVADO", "PREPARANDO_ENVIO"].includes(
      status
    );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const result = await updateOrderAddressAction(orderId, {}, formData);
    setState(result);

    if (result.success) {
      setIsEditing(false);
      // Reload page para pegar dados novos
      window.location.reload();
    }
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-ink-muted">Nome</label>
          <input
            type="text"
            name="name"
            defaultValue={initialAddress.name}
            className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
            required
          />
          {state.fieldErrors?.name && (
            <p className="mt-0.5 text-xs text-red-600">{state.fieldErrors.name[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-ink-muted">Rua</label>
            <input
              type="text"
              name="street"
              defaultValue={initialAddress.street}
              className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted">Número</label>
            <input
              type="text"
              name="number"
              defaultValue={initialAddress.number}
              className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-muted">Complemento</label>
          <input
            type="text"
            name="complement"
            defaultValue={initialAddress.complement || ""}
            placeholder="Apto, sala, etc."
            className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-ink-muted">Bairro</label>
            <input
              type="text"
              name="neighborhood"
              defaultValue={initialAddress.neighborhood}
              className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted">CEP</label>
            <input
              type="text"
              name="cep"
              defaultValue={initialAddress.cep}
              className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
              required
              pattern="\d{5}-?\d{3}"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-ink-muted">Cidade</label>
            <input
              type="text"
              name="city"
              defaultValue={initialAddress.city}
              className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted">Estado</label>
            <input
              type="text"
              name="state"
              defaultValue={initialAddress.state}
              className="mt-1 w-full rounded border border-line px-2 py-1.5 text-sm uppercase"
              required
              maxLength={2}
            />
          </div>
        </div>

        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        {state.success && (
          <p className="text-xs text-green-600">Endereço atualizado com sucesso!</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1 text-sm">
            Confirmar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsEditing(false)}
            className="flex-1 text-sm"
          >
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-soft">{initialAddress.name}</p>
      <p className="text-sm text-ink-muted">
        {initialAddress.street}, {initialAddress.number}
        {initialAddress.complement && ` — ${initialAddress.complement}`}
      </p>
      <p className="text-sm text-ink-muted">
        {initialAddress.neighborhood}, {initialAddress.city}/{initialAddress.state}
      </p>
      <p className="text-sm text-ink-muted">CEP {initialAddress.cep}</p>

      {canEdit && (
        <button
          onClick={() => setIsEditing(true)}
          className="mt-3 text-xs text-brand hover:underline"
        >
          ✏️ Editar endereço
        </button>
      )}
      {!canEdit && (
        <p className="mt-3 text-xs text-ink-muted">
          Não é possível alterar após o envio
        </p>
      )}
    </div>
  );
}
