import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth-helpers";
import { getSellerDashboardSummary } from "@/lib/admin";
import { SellerDashboard } from "./SellerDashboard";

export const metadata: Metadata = { title: "Painel" };

export default async function PainelPage() {
  const user = await requireStaff();
  const summary = await getSellerDashboardSummary();

  return <SellerDashboard name={user.name} role={user.role} summary={summary} />;
}
