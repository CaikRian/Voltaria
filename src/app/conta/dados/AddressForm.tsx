"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { lookupCep } from "@/lib/cep";
import type { AddressFormState } from "@/lib/actions/addresses";

export type AddressInitial = {
  label: string;
  name: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
};

const empty: AddressInitial = {
  label: "",
  name: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  isDefault: false,
};

type Props = {
  action: (state: AddressFormState, formData: FormData) => Promise<AddressFormState>;
  initial?: AddressInitial;
  submitLabel: string;
  onDone?: () => void;
};

export function AddressForm({ action, initial, submitLabel, onDone }: Props) {
  const init = initial ?? empty;
  const [state, formAction, pending] = useActionState<AddressFormState, FormData>(action, {});
  const [fields, setFields] = useState(init);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");

  // Só fecha/avisa o pai DEPOIS da action confirmar sucesso — chamar onDone logo
  // após disparar a action (que é assíncrona) esconderia erros de validação.
  useEffect(() => {
    if (state.success) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  function field(key: keyof AddressInitial) {
    return {
      value: fields[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setFields((s) => ({ ...s, [key]: e.target.value })),
    };
  }

  async function handleCepBlur() {
    const digits = fields.cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepStatus("loading");
    const result = await lookupCep(digits);
    if (!result) {
      setCepStatus("notfound");
      return;
    }
    setCepStatus("found");
    setFields((s) => ({
      ...s,
      street: result.street || s.street,
      neighborhood: result.neighborhood || s.neighborhood,
      city: result.city || s.city,
      state: result.state || s.state,
    }));
  }

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      {state.error && <p className="sm:col-span-2 text-sm text-deal">{state.error}</p>}

      <div className="sm:col-span-2">
        <input
          name="label"
          placeholder="Nome do endereço (ex.: Casa, Trabalho)"
          required
          className="h-11 w-full rounded-xl border border-line px-4 text-sm"
          {...field("label")}
        />
        {state.fieldErrors?.label && <p className="mt-1 text-xs text-deal">{state.fieldErrors.label[0]}</p>}
      </div>

      <div className="sm:col-span-2">
        <input
          name="name"
          placeholder="Nome do destinatário"
          required
          className="h-11 w-full rounded-xl border border-line px-4 text-sm"
          {...field("name")}
        />
        {state.fieldErrors?.name && <p className="mt-1 text-xs text-deal">{state.fieldErrors.name[0]}</p>}
      </div>

      <div>
        <input
          name="cep"
          placeholder="CEP"
          required
          className="h-11 w-full rounded-xl border border-line px-4 text-sm"
          {...field("cep")}
          onBlur={handleCepBlur}
        />
        {cepStatus === "loading" && <p className="mt-1 text-xs text-ink-muted">Buscando endereço...</p>}
        {cepStatus === "notfound" && (
          <p className="mt-1 text-xs text-ink-muted">CEP não encontrado — preencha manualmente.</p>
        )}
        {state.fieldErrors?.cep && <p className="mt-1 text-xs text-deal">{state.fieldErrors.cep[0]}</p>}
      </div>

      <div>
        <input
          name="number"
          placeholder="Número"
          required
          className="h-11 w-full rounded-xl border border-line px-4 text-sm"
          {...field("number")}
        />
        {state.fieldErrors?.number && <p className="mt-1 text-xs text-deal">{state.fieldErrors.number[0]}</p>}
      </div>

      <div className="sm:col-span-2">
        <input
          name="street"
          placeholder="Rua"
          required
          className="h-11 w-full rounded-xl border border-line px-4 text-sm"
          {...field("street")}
        />
        {state.fieldErrors?.street && <p className="mt-1 text-xs text-deal">{state.fieldErrors.street[0]}</p>}
      </div>

      <div>
        <input
          name="complement"
          placeholder="Complemento (opcional)"
          className="h-11 w-full rounded-xl border border-line px-4 text-sm"
          {...field("complement")}
        />
      </div>

      <div>
        <input
          name="neighborhood"
          placeholder="Bairro"
          required
          className="h-11 w-full rounded-xl border border-line px-4 text-sm"
          {...field("neighborhood")}
        />
        {state.fieldErrors?.neighborhood && (
          <p className="mt-1 text-xs text-deal">{state.fieldErrors.neighborhood[0]}</p>
        )}
      </div>

      <div>
        <input
          name="city"
          placeholder="Cidade"
          required
          className="h-11 w-full rounded-xl border border-line px-4 text-sm"
          {...field("city")}
        />
        {state.fieldErrors?.city && <p className="mt-1 text-xs text-deal">{state.fieldErrors.city[0]}</p>}
      </div>

      <div>
        <input
          name="state"
          placeholder="UF"
          maxLength={2}
          required
          className="h-11 w-full rounded-xl border border-line px-4 text-sm"
          value={fields.state}
          onChange={(e) => setFields((s) => ({ ...s, state: e.target.value.toUpperCase() }))}
        />
        {state.fieldErrors?.state && <p className="mt-1 text-xs text-deal">{state.fieldErrors.state[0]}</p>}
      </div>

      <div className="sm:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isDefault"
            defaultChecked={init.isDefault}
            className="h-4 w-4 accent-brand"
          />
          Definir como endereço padrão
        </label>
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
