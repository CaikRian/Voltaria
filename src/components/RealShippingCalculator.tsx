"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/format";
import type { RealShippingOption } from "@/lib/shipping-real";

export function RealShippingCalculator({ items }: { items: Array<{ productId: string; qty: number }> }) {
  const [cep, setCep] = useState("");
  const [options, setOptions] = useState<RealShippingOption[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  async function calculate() {
    if (cep.replace(/\D/g, "").length !== 8) return setStatus("error");
    setStatus("loading"); setOptions([]);
    try {
      const response = await fetch("/api/frete/cotacao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cep, items }) });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.options)) throw new Error();
      setOptions(data.options); setStatus("idle");
    } catch { setStatus("error"); }
  }
  return <div className="rounded-xl border border-line bg-paper p-4 text-sm"><p className="mb-2 font-medium">Calcular frete real</p><div className="flex gap-2"><input value={cep} onChange={(event) => setCep(event.target.value)} placeholder="00000-000" inputMode="numeric" maxLength={9} className="h-10 min-w-0 flex-1 rounded-lg border border-line px-3 text-sm" /><button type="button" onClick={calculate} disabled={status === "loading"} className="rounded-lg bg-brand px-4 text-xs font-bold text-white disabled:opacity-60">{status === "loading" ? "Consultando..." : "Calcular"}</button></div>{status === "error" && <p className="mt-2 text-xs text-deal">Não foi possível calcular. Confira o CEP e tente novamente.</p>}{options.length > 0 && <ul className="mt-3 space-y-2">{options.map((option) => <li key={option.id} className="flex items-center justify-between rounded-lg bg-mist px-3 py-2"><div><p className="font-medium">{option.company} · {option.label}</p><p className="text-xs text-ink-muted">{option.etaLabel}</p></div><span className="font-semibold">{option.free ? "Grátis" : formatBRL(option.priceCents)}</span></li>)}</ul>}</div>;
}
