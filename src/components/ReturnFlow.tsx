"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { createReturnRequestAction, executeRefundAction, inspectReturnAction, markReturnShippedAction, receiveReturnAction, reviewReturnAction, type ReturnActionState } from "@/lib/actions/returns";
import { formatBRL } from "@/lib/format";

type Item = { id: string; productName: string; variantName: string | null; qty: number; unitCents: number };
type ReturnData = {
  id: string; status: string; reasonCategory: string; reasonDetails: string; requestedCents: number; approvedCents: number | null;
  requestType: string;
  evidenceUrls: string | null;
  reverseInstructions: string | null; reverseTrackingCode: string | null; rejectionReason: string | null; refundError: string | null;
  items: Array<{ id: string; qty: number; condition: string | null; restockDecision: string; orderItem: Item }>;
  events: Array<{ id: string; status: string; note: string | null; createdAt: Date | string }>;
};

const LABELS: Record<string, string> = {
  REQUESTED: "Em análise", AWAITING_SHIPMENT: "Aguardando postagem", IN_TRANSIT: "Em trânsito", RECEIVED: "Recebida",
  INSPECTED: "Inspecionada", REFUND_PROCESSING: "Reembolso em processamento", REFUNDED: "Reembolsada", REFUND_FAILED: "Falha no reembolso",
  REJECTED: "Não aprovada", CANCELLED: "Cancelada",
};

function EvidenceGallery({ value }: { value: string | null }) {
  let urls: string[] = [];
  try { urls = value ? JSON.parse(value) : []; } catch { urls = []; }
  if (!urls.length) return null;
  return <div className="mt-3 flex gap-2 overflow-x-auto">{urls.map((url) => <a key={url} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="Evidência da devolução" className="h-20 w-20 rounded-lg border border-line object-cover" /></a>)}</div>;
}

function SubmitForm({ action, children, className = "space-y-3" }: { action: (prev: ReturnActionState, data: FormData) => Promise<ReturnActionState>; children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const [state, setState] = useState<ReturnActionState>({});
  const [busy, setBusy] = useState(false);
  return <form className={className} onSubmit={async (event) => { event.preventDefault(); setBusy(true); const result = await action({}, new FormData(event.currentTarget)); setState(result); setBusy(false); if (result.success) router.refresh(); }}>
    {children}
    {state.error && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{state.error}</p>}
    {state.success && <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">Alteração registrada com sucesso.</p>}
    <button disabled={busy} className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? "Processando..." : "Confirmar"}</button>
  </form>;
}

function EvidenceUpload({ orderId }: { orderId: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function add(file: File) {
    setBusy(true); setError(null);
    try {
      const blob = await upload(`returns/${orderId}/${file.name}`, file, { access: "public", handleUploadUrl: "/api/chat/upload", clientPayload: JSON.stringify({ orderId }) });
      setUrls((current) => [...current, blob.url].slice(0, 8));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao anexar evidência."); }
    finally { setBusy(false); }
  }
  return <div><input type="hidden" name="evidenceUrls" value={urls.join("\n")} /><label className="inline-flex cursor-pointer rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-xs font-bold text-brand-dark">{busy ? "Enviando..." : "Anexar foto"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy || urls.length >= 8} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void add(file); event.target.value = ""; }} /></label>{urls.length > 0 && <p className="mt-1 text-xs text-emerald-700">{urls.length} evidência(s) anexada(s).</p>}{error && <p className="mt-1 text-xs text-red-700">{error}</p>}</div>;
}

export function CustomerReturnFlow({ orderId, orderStatus, items, requests }: { orderId: string; orderStatus: string; items: Item[]; requests: ReturnData[] }) {
  const [open, setOpen] = useState(false);
  const canRequest = ["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO", "ENVIADO", "ENTREGUE"].includes(orderStatus);
  const beforeShipment = ["PAGAMENTO_APROVADO", "PREPARANDO_ENVIO"].includes(orderStatus);
  return <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card">
    <div className="flex items-start justify-between gap-3"><div><p className="font-display text-lg font-semibold">Cancelamentos e devoluções</p><p className="text-xs text-ink-muted">Acompanhe cada etapa até a conclusão do reembolso.</p></div>{canRequest && <button onClick={() => setOpen(!open)} className="rounded-xl bg-brand-soft px-3 py-2 text-xs font-bold text-brand-dark">{open ? "Fechar" : "Solicitar reembolso"}</button>}</div>
    {open && <div className="mt-4 rounded-xl border border-line bg-mist/50 p-4"><SubmitForm action={createReturnRequestAction.bind(null, orderId)}>
      <p className="rounded-lg bg-blue-50 p-2 text-xs text-blue-800">{beforeShipment ? "Como o pedido ainda não foi enviado, a solicitação será tratada como cancelamento. Não será necessário devolver produto." : "Como o pedido já foi enviado, a equipe orientará a devolução e a postagem do produto."}</p>
      <label className="block text-xs font-bold">Motivo<select name="reasonCategory" required className="mt-1 w-full rounded-lg border border-line bg-white p-2 text-sm"><option value="">Selecione</option><option value="ARREPENDIMENTO">Arrependimento da compra</option><option value="DEFEITO">Defeito</option><option value="DANIFICADO">Produto danificado</option><option value="ITEM_INCORRETO">Item incorreto</option><option value="INCOMPLETO">Item incompleto</option><option value="OUTRO">Outro</option></select></label>
      <div className="space-y-2"><p className="text-xs font-bold">Itens e quantidades{beforeShipment ? " — pedido completo" : ""}</p>{items.map((item) => <label key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-2 text-sm"><span>{item.productName}{item.variantName ? ` · ${item.variantName}` : ""}</span><input name={`qty_${item.id}`} type="number" min={beforeShipment ? item.qty : 0} max={item.qty} defaultValue={beforeShipment ? item.qty : 0} readOnly={beforeShipment} className="w-16 rounded border border-line p-1 text-center read-only:bg-slate-100" /></label>)}</div>
      <label className="block text-xs font-bold">Conte o que aconteceu<textarea name="reasonDetails" required minLength={10} maxLength={2000} rows={4} className="mt-1 w-full rounded-lg border border-line bg-white p-2 text-sm" /></label>
      <div><p className="mb-1 text-xs font-bold">Fotos do produto ou embalagem (opcional, até 8)</p><EvidenceUpload orderId={orderId} /></div>
    </SubmitForm></div>}
    <div className="mt-4 space-y-3">{requests.length === 0 ? <p className="text-sm text-ink-muted">Nenhuma devolução solicitada.</p> : requests.map((request) => <article key={request.id} className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap justify-between gap-2"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-brand-soft px-2 py-1 text-xs font-bold text-brand-dark">{LABELS[request.status] || request.status}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{request.requestType === "CANCELLATION" ? "Cancelamento antes do envio" : "Devolução"}</span></div><p className="mt-2 text-sm font-semibold">{request.items.map((item) => `${item.qty}× ${item.orderItem.productName}`).join(", ")}</p></div><strong>{formatBRL(request.approvedCents ?? request.requestedCents)}</strong></div>
      <p className="mt-2 text-xs text-ink-muted">{request.reasonDetails}</p>
      <EvidenceGallery value={request.evidenceUrls} />
      {request.rejectionReason && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">Motivo: {request.rejectionReason}</p>}
      {request.reverseInstructions && <p className="mt-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800"><strong>Como devolver:</strong> {request.reverseInstructions}</p>}
      {request.status === "AWAITING_SHIPMENT" && <div className="mt-3"><SubmitForm action={markReturnShippedAction.bind(null, request.id)}><input name="trackingCode" required placeholder="Código de postagem/rastreio" className="w-full rounded-lg border border-line p-2 text-sm" /></SubmitForm></div>}
      <details className="mt-3 text-xs"><summary className="cursor-pointer font-bold text-brand">Ver histórico</summary><ol className="mt-2 space-y-1 border-l border-line pl-3">{request.events.map((event) => <li key={event.id}>{new Date(event.createdAt).toLocaleString("pt-BR")} · {LABELS[event.status] || event.status}{event.note ? ` — ${event.note}` : ""}</li>)}</ol></details>
    </article>)}</div>
  </section>;
}

export function StaffReturnFlow({ requests, canRefund }: { requests: ReturnData[]; canRefund: boolean }) {
  return <section className="rounded-xl2 border border-line bg-paper p-5 shadow-card"><div className="mb-4"><p className="font-display text-lg font-semibold">Central de devoluções</p><p className="text-xs text-ink-muted">Análise, logística reversa, inspeção, estoque e reembolso.</p></div>
    <div className="space-y-4">{requests.length === 0 ? <p className="text-sm text-ink-muted">Nenhuma solicitação.</p> : requests.map((request) => <article key={request.id} className="rounded-xl border border-line p-4">
      <div className="flex justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">{LABELS[request.status] || request.status}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{request.requestType === "CANCELLATION" ? "Cancelamento" : "Devolução física"}</span></div><p className="mt-2 text-sm font-semibold">{request.items.map((item) => `${item.qty}× ${item.orderItem.productName}`).join(", ")}</p><p className="mt-1 text-xs text-ink-muted">{request.reasonDetails}</p></div><strong>{formatBRL(request.approvedCents ?? request.requestedCents)}</strong></div>
      <EvidenceGallery value={request.evidenceUrls} />
      {request.status === "REQUESTED" && <div className="mt-4"><SubmitForm action={reviewReturnAction.bind(null, request.id)}><select name="decision" required className="w-full rounded-lg border border-line p-2 text-sm"><option value="APPROVE">Aprovar {request.requestType === "CANCELLATION" ? "cancelamento" : "devolução"}</option><option value="REJECT">Recusar com justificativa</option></select>{request.requestType === "RETURN" && <textarea name="reverseInstructions" rows={3} placeholder="Instruções e endereço/código de postagem" className="w-full rounded-lg border border-line p-2 text-sm" />}<textarea name="note" rows={2} placeholder="Observação interna ou justificativa da recusa" className="w-full rounded-lg border border-line p-2 text-sm" /></SubmitForm></div>}
      {["IN_TRANSIT", "AWAITING_SHIPMENT"].includes(request.status) && <div className="mt-4"><SubmitForm action={async (prev) => receiveReturnAction(request.id, prev)}><p className="text-xs text-ink-muted">Confirme somente após conferir fisicamente o pacote.</p></SubmitForm></div>}
      {request.status === "RECEIVED" && <div className="mt-4"><SubmitForm action={inspectReturnAction.bind(null, request.id)}>{request.items.map((item) => <div key={item.id} className="rounded-lg bg-mist p-3"><p className="mb-2 text-sm font-bold">{item.qty}× {item.orderItem.productName}</p><select name={`condition_${item.id}`} required className="w-full rounded border border-line bg-white p-2 text-sm"><option value="">Condição...</option><option value="SEALED">Lacrado</option><option value="SELLABLE">Íntegro/revendável</option><option value="DAMAGED">Danificado</option><option value="INCOMPLETE">Incompleto</option><option value="MISSING">Não recebido</option></select><input type="hidden" name={`approvedQty_${item.id}`} value={item.qty} /><label className="mt-2 flex gap-2 text-xs"><input type="checkbox" name={`restock_${item.id}`} /> Repor no estoque (somente íntegro/lacrado)</label></div>)}<label className="flex gap-2 text-xs"><input type="checkbox" name="includeShipping" /> Incluir o frete original no reembolso</label><textarea name="note" rows={2} placeholder="Laudo da inspeção" className="w-full rounded-lg border border-line p-2 text-sm" /></SubmitForm></div>}
      {["INSPECTED", "REFUND_FAILED"].includes(request.status) && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">{request.refundError && <p className="mb-2 text-xs text-red-700">Última tentativa: {request.refundError}</p>}{canRefund ? <SubmitForm action={async (prev) => executeRefundAction(request.id, prev)}><p className="text-xs text-amber-900">Esta ação movimenta dinheiro real no Mercado Pago e usa proteção contra duplicidade.</p></SubmitForm> : <p className="text-xs text-amber-900">Aguardando gerente ou administrador autorizar o reembolso.</p>}</div>}
      <details className="mt-3 text-xs"><summary className="cursor-pointer font-bold text-brand">Auditoria completa</summary><ol className="mt-2 space-y-1 border-l border-line pl-3">{request.events.map((event) => <li key={event.id}>{new Date(event.createdAt).toLocaleString("pt-BR")} · {LABELS[event.status] || event.status}{event.note ? ` — ${event.note}` : ""}</li>)}</ol></details>
    </article>)}</div>
  </section>;
}
