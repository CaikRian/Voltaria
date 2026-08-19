import type { Metadata } from "next";
import { RecoveryForm } from "./RecoveryForm";

export const metadata: Metadata = { title: "Recuperar conta" };
export default function RecoveryPage() { return <div><p className="text-xs font-black uppercase tracking-[.18em] text-brand">Acesso à conta</p><h1 className="mt-1 font-display text-2xl font-bold">Vamos recuperar seu acesso</h1><p className="mb-6 mt-2 text-sm text-ink-soft">Escolha o que você precisa recuperar.</p><RecoveryForm /></div>; }
