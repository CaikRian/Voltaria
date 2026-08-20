import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth-helpers";
import { getSellerDashboardSummary } from "@/lib/admin";
import { SellerDashboard } from "./SellerDashboard";

export const metadata: Metadata = { title: "Painel" };

type SearchParams = Promise<{ integracao?: string }>;

export default async function PainelPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireStaff();
  const [summary, params] = await Promise.all([getSellerDashboardSummary(), searchParams]);

  return <SellerDashboard name={user.name} role={user.role} summary={summary} integrationResult={params.integracao} />;
}
