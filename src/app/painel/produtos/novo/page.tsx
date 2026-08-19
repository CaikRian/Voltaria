import type { Metadata } from "next";
import Link from "next/link";
import { getCategoriesForSelect } from "@/lib/admin";
import { requireCapability } from "@/lib/auth-helpers";
import { can } from "@/lib/permissions";
import { createProduct } from "@/lib/actions/products";
import { ProductForm } from "../ProductForm";

export const metadata: Metadata = { title: "Novo produto · Painel" };

export default async function NovoProdutoPage() {
  const user = await requireCapability("product:create");
  const categories = await getCategoriesForSelect();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-slate-900 to-brand-dark p-6 text-white shadow-pop"><div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-brand/25 blur-3xl" /><div className="relative"><Link href="/painel/produtos" className="text-sm font-semibold text-white/60 hover:text-white">← Voltar ao catálogo</Link><p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-white/50">Novo item do catálogo</p><h1 className="mt-1 font-display text-2xl font-bold">Cadastrar produto</h1><p className="mt-2 max-w-xl text-sm text-white/60">Preencha as informações comerciais, confira a prévia e publique quando estiver pronto.</p></div></section>

      <ProductForm
        action={createProduct}
        categories={categories}
        canEditPrice={can(user.role, "product:price")}
        submitLabel="Cadastrar produto"
      />
    </div>
  );
}
