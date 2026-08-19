"use client";

import { useState, useTransition } from "react";
import { deleteProduct } from "@/lib/actions/products";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const confirmed = confirmation.trim() === name;

  function handleDelete() {
    if (!confirmed || pending) return;
    startTransition(() => deleteProduct(id));
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition hover:border-red-600 hover:bg-red-600 hover:text-white">Excluir produto</button>
      {open && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-product-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setOpen(false); }}>
        <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-red-200 bg-white shadow-2xl">
          <div className="border-b border-red-100 bg-red-50 p-5"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-100 text-xl text-red-700">!</span><div><p className="text-xs font-black uppercase tracking-[.16em] text-red-600">Ação permanente</p><h2 id="delete-product-title" className="mt-1 font-display text-xl font-bold text-slate-950">Excluir produto?</h2></div></div></div>
          <div className="p-5"><p className="text-sm leading-6 text-slate-600">Você está prestes a excluir <strong className="text-slate-950">{name}</strong> e todas as suas variações. Esta ação não poderá ser desfeita.</p><label className="mt-5 block"><span className="text-xs font-bold text-slate-700">Para confirmar, digite exatamente:</span><code className="mt-2 block select-all rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800">{name}</code><input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleDelete(); } }} placeholder="Digite o nome do produto" disabled={pending} className={`mt-2 h-11 w-full rounded-xl border px-4 text-sm outline-none focus:ring-2 ${confirmation && !confirmed ? "border-red-300 focus:ring-red-100" : "border-line focus:border-brand focus:ring-brand/10"}`} /></label>{confirmation && !confirmed && <p className="mt-2 text-xs font-medium text-red-600">O nome digitado ainda não corresponde ao produto.</p>}</div>
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-slate-50 p-4 sm:flex-row sm:justify-end"><button type="button" disabled={pending} onClick={() => { setOpen(false); setConfirmation(""); }} className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">Cancelar</button><button type="button" onClick={handleDelete} disabled={!confirmed || pending} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white shadow-card hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-200">{pending ? "Excluindo..." : "Excluir permanentemente"}</button></div>
        </div>
      </div>}
    </>
  );
}
