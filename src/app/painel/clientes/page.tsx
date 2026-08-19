import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth-helpers";
import { CustomersDashboard } from "./CustomersDashboard";

export const metadata: Metadata = { title: "Clientes · Painel" };

type SearchParams = Promise<{ q?: string; sort?: string; page?: string; pageSize?: string }>;

export default async function PainelClientesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireCapability("customer:view");
  const filters = await searchParams;
  return <CustomersDashboard filters={filters} />;
}
