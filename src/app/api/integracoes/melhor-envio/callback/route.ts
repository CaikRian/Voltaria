import { NextRequest, NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth-helpers";
import { exchangeAuthorizationCode, validateOAuthState } from "@/lib/melhor-envio";

export async function GET(request: NextRequest) {
  await requireCapability("order:update:status");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state || !validateOAuthState(state)) {
    return NextResponse.redirect(new URL("/painel?integracao=erro", request.url));
  }
  try {
    await exchangeAuthorizationCode(code);
    return NextResponse.redirect(new URL("/painel?integracao=melhor-envio-ok", request.url));
  } catch (error) {
    console.error("Falha no OAuth do Melhor Envio:", error);
    return NextResponse.redirect(new URL("/painel?integracao=erro", request.url));
  }
}
