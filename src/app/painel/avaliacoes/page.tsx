import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth-helpers";
import { ReviewsDashboard } from "./ReviewsDashboard";

export const metadata: Metadata = { title: "Avaliações · Painel" };

type SearchParams = Promise<{ q?: string; rating?: string; visibility?: string; sort?: string; page?: string; pageSize?: string }>;

export default async function PainelAvaliacoesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireCapability("content:moderate");
  const filters = await searchParams;
  return <ReviewsDashboard filters={filters} />;
}
