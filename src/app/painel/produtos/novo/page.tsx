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
    <div>
      <div className="mb-6">
        <Link href="/painel/produtos" className="text-sm text-brand hover:underline">
          ← Voltar para produtos
        </Link>
        <h2 className="mt-1 font-display text-xl font-semibold">Novo produto</h2>
      </div>

      <ProductForm
        action={createProduct}
        categories={categories}
        canEditPrice={can(user.role, "product:price")}
        submitLabel="Cadastrar produto"
      />
    </div>
  );
}
