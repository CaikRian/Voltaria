"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/format";
import { getShippingOptions, normalizeCep } from "@/lib/shipping";

// Simulador de frete reusado na página de produto (subtotal = preço do item,
// qty 1) e no carrinho (subtotal = total do carrinho). Só prévia informativa —
// não alimenta o checkout, que tem seu próprio seletor com endereço completo.
export function ShippingCalculator({ subtotalCents }: { subtotalCents: number }) {
  const [cep, setCep] = useState("");
  const digits = normalizeCep(cep);
  const options = digits ? getShippingOptions(cep, subtotalCents) : null;

  return (
    <div className="rounded-xl border border-line bg-paper p-4 text-sm">
      <p className="mb-2 font-medium">Calcular frete</p>
      <input
        value={cep}
        onChange={(e) => setCep(e.target.value)}
        placeholder="00000-000"
        inputMode="numeric"
        maxLength={9}
        className="h-10 w-full rounded-lg border border-line px-3 text-sm focus:border-brand"
      />
      {cep.length > 0 && !digits && (
        <p className="mt-2 text-xs text-deal">Informe um CEP válido (8 dígitos).</p>
      )}
      {options && (
        <ul className="mt-3 flex flex-col gap-2">
          {options.map((o) => (
            <li key={o.id} className="flex items-center justify-between rounded-lg bg-mist px-3 py-2">
              <div>
                <p className="font-medium">{o.label}</p>
                <p className="text-xs text-ink-muted">{o.etaLabel}</p>
              </div>
              <span className="font-semibold">{o.priceCents === 0 ? "Grátis" : formatBRL(o.priceCents)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
