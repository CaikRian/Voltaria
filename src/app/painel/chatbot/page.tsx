import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth-helpers";
import { ChatbotInbox } from "./ChatbotInbox";

export const metadata: Metadata = { title: "Chat-bot · Painel" };

type SearchParams = Promise<{ filtro?: string; q?: string; page?: string }>;

export default async function PainelChatbotPage({ searchParams }: { searchParams: SearchParams }) {
  await requireStaff();
  const filters = await searchParams;
  return <ChatbotInbox filters={filters} />;
}
