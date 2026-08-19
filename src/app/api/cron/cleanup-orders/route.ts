/**
 * API Cron Job - Cleanup de pedidos abandonados
 * 
 * Configurar em sua plataforma de hosting (Vercel, Railway, etc):
 * 
 * Vercel (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-orders",
 *     "schedule": "0,10,20,30,40,50 * * * *"  // a cada dez minutos
 *   }]
 * }
 * 
 * Railway / Render / Outros:
 * curl https://seu-site.com/api/cron/cleanup-orders
 */

import { NextRequest, NextResponse } from "next/server";
import { cleanupAbandonedOrders, closeStaleChats } from "@/lib/cleanup-orders";

// Validação simples de segurança — adicione um token em produção
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Verificar origem (proteção básica)
  const origin = req.headers.get("origin");
  const isLocalhost = origin?.includes("localhost") || origin?.includes("127.0.0.1");

  // Vercel Cron envia o segredo no header Authorization. O query param continua
  // aceito para chamadas manuais e outros provedores de cron.
  if (!isLocalhost && CRON_SECRET) {
    const token = req.nextUrl.searchParams.get("token");
    const bearer = req.headers.get("authorization");
    if (token !== CRON_SECRET && bearer !== `Bearer ${CRON_SECRET}`) {
      console.warn("[Cron] Tentativa de acesso não autorizada");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    console.log("[Cron] Iniciando cleanup de pedidos abandonados...");
    const abandonedCount = await cleanupAbandonedOrders();

    console.log("[Cron] Iniciando fechamento de chats inativos...");
    const closedChatsCount = await closeStaleChats();

    return NextResponse.json(
      {
        success: true,
        message: `Cleanup concluído: ${abandonedCount} reservas expiradas e liberadas, ${closedChatsCount} chats fechados por inatividade`,
        abandonedCount,
        closedChatsCount,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Cron] Erro no cleanup:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao executar cleanup",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

// POST também é suportado (alguns serviços de cron usam POST)
export const POST = GET;
