"use client";

import { useActionState } from "react";
import { buyShippingLabelAction, generateShippingLabelAction, printShippingLabelAction, syncShippingTrackingAction, type ShippingActionState } from "@/lib/actions/shipping";
import { formatBRL } from "@/lib/format";

function ActionForm({ action, label, children }: { action: (state: ShippingActionState, data: FormData) => Promise<ShippingActionState>; label: string; children?: React.ReactNode }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="space-y-2">{children}{state.error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{state.error}</p>}{state.success && <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">Etapa concluída.</p>}<button disabled={pending} className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{pending ? "Processando..." : label}</button></form>;
}

export function ShippingOperations({ orderId, labelStatus, labelUrl, invoiceKey, labelCostCents, chargedCents, error, recipientPhone, recipientDocument }: { orderId: string; labelStatus: string | null; labelUrl: string | null; invoiceKey: string | null; labelCostCents: number | null; chargedCents: number | null; error: string | null; recipientPhone: string | null; recipientDocument: string | null }) {
  return <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
    <div className="mb-4 flex items-start justify-between gap-3"><div><p className="font-display text-lg font-semibold">Expedição pelo Melhor Envio</p><p className="text-xs text-ink-muted">Compra, geração, impressão e rastreamento da etiqueta.</p></div><span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-dark">{labelStatus || "Não iniciada"}</span></div>
    {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"><strong>Atenção:</strong> {error}</p>}
    {labelCostCents != null && <div className="mb-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-mist p-2"><span className="text-ink-muted">Cobrado do cliente</span><strong className="block">{formatBRL(chargedCents || 0)}</strong></div><div className="rounded-lg bg-mist p-2"><span className="text-ink-muted">Custo da etiqueta</span><strong className="block">{formatBRL(labelCostCents)}</strong></div></div>}
    {!labelStatus || labelStatus === "CART" ? <ActionForm action={buyShippingLabelAction.bind(null, orderId)} label={labelStatus === "CART" ? "Tentar pagar etiqueta novamente" : "Comprar etiqueta"}><div className="grid grid-cols-2 gap-2"><label className="block text-xs font-bold">Telefone<input name="recipientPhone" defaultValue={recipientPhone || ""} inputMode="tel" required className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-xs" /></label><label className="block text-xs font-bold">CPF destinatário<input name="recipientDocument" defaultValue={recipientDocument || ""} inputMode="numeric" required className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-xs" /></label></div><label className="block text-xs font-bold">Chave da NF-e<input name="invoiceKey" defaultValue={invoiceKey || ""} inputMode="numeric" required minLength={44} maxLength={44} placeholder="44 dígitos" className="mt-1 h-10 w-full rounded-lg border border-line px-3 font-mono text-xs" /></label><label className="flex items-start gap-2 text-xs text-ink-soft"><input type="checkbox" name="acceptDifference" className="mt-0.5" /> Autorizo comprar mesmo se a nova cotação estiver acima do frete cobrado.</label></ActionForm> : null}
    {labelStatus === "PURCHASED" && <ActionForm action={async (state) => generateShippingLabelAction(orderId, state)} label="Gerar etiqueta" />}
    {labelStatus === "GENERATED" && !labelUrl && <ActionForm action={async (state) => printShippingLabelAction(orderId, state)} label="Gerar link de impressão" />}
    {labelUrl && <a href={labelUrl} target="_blank" rel="noopener noreferrer" className="mb-3 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">Abrir e imprimir etiqueta ↗</a>}
    {labelStatus && <div className="mt-3 border-t border-line pt-3"><ActionForm action={async (state) => syncShippingTrackingAction(orderId, state)} label="Sincronizar com a transportadora agora" /></div>}
  </section>;
}
