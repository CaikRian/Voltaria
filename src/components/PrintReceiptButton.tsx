"use client";

export function PrintReceiptButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
    >
      Imprimir ou salvar em PDF
    </button>
  );
}
