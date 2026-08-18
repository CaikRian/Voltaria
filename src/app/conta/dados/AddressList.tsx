"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { createAddress, updateAddress, deleteAddress, setDefaultAddress } from "@/lib/actions/addresses";
import type { getAddressesByUser } from "@/lib/addresses";
import { AddressForm } from "./AddressForm";

type SavedAddress = Awaited<ReturnType<typeof getAddressesByUser>>[number];

export function AddressList({ addresses }: { addresses: SavedAddress[] }) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string, label: string) {
    if (!confirm(`Excluir o endereço "${label}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(() => deleteAddress(id));
  }

  return (
    <div className="flex flex-col gap-4">
      {addresses.map((a) =>
        editingId === a.id ? (
          <div key={a.id} className="rounded-xl2 border border-line bg-paper p-4">
            <AddressForm
              action={updateAddress.bind(null, a.id)}
              initial={{
                label: a.label,
                name: a.name,
                cep: a.cep,
                street: a.street,
                number: a.number,
                complement: a.complement ?? "",
                neighborhood: a.neighborhood,
                city: a.city,
                state: a.state,
                isDefault: a.isDefault,
              }}
              submitLabel="Salvar alterações"
              onDone={() => setEditingId(null)}
            />
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="mt-2 text-xs text-ink-muted hover:text-deal"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div key={a.id} className="rounded-xl2 border border-line bg-paper p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {a.label}{" "}
                  {a.isDefault && (
                    <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand">
                      Padrão
                    </span>
                  )}
                </p>
                <p className="text-sm text-ink-soft">{a.name}</p>
                <p className="text-sm text-ink-muted">
                  {a.street}, {a.number}
                  {a.complement ? ` — ${a.complement}` : ""}
                </p>
                <p className="text-sm text-ink-muted">
                  {a.neighborhood}, {a.city}/{a.state} · CEP {a.cep}
                </p>
              </div>
              <div className="flex shrink-0 gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setEditingId(a.id)}
                  className="rounded-lg px-2 py-1 text-brand hover:bg-brand-soft"
                >
                  Editar
                </button>
                {!a.isDefault && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => setDefaultAddress(a.id))}
                    className="rounded-lg px-2 py-1 text-ink-muted hover:bg-mist disabled:opacity-50"
                  >
                    Tornar padrão
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleDelete(a.id, a.label)}
                  className="rounded-lg px-2 py-1 text-ink-muted hover:bg-mist hover:text-deal disabled:opacity-50"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {editingId === "new" ? (
        <div className="rounded-xl2 border border-line bg-paper p-4">
          <AddressForm action={createAddress} submitLabel="Adicionar endereço" onDone={() => setEditingId(null)} />
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="mt-2 text-xs text-ink-muted hover:text-deal"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setEditingId("new")} className="self-start">
          + Adicionar endereço
        </Button>
      )}
    </div>
  );
}
