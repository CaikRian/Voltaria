import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/auth-helpers";
import { getAuthorizationUrl } from "@/lib/melhor-envio";

export async function GET() {
  await requireCapability("order:update:status");
  return NextResponse.redirect(getAuthorizationUrl());
}
