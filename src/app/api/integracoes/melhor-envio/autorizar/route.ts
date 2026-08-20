import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth-helpers";
import { getAuthorizationUrl } from "@/lib/melhor-envio";

export async function GET(request: Request) {
  try {
    await requireCapability("order:update:status");
    return NextResponse.redirect(getAuthorizationUrl());
  } catch (error) {
    console.error("Falha ao iniciar OAuth do Melhor Envio:", error);
    return NextResponse.redirect(new URL("/painel?integracao=configuracao-erro", request.url));
  }
}
