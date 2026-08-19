import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRealShippingOptions } from "@/lib/shipping-real";

const schema = z.object({ cep: z.string().regex(/^\d{5}-?\d{3}$/), items: z.array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(100) })).min(1).max(50) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados de cotação inválidos." }, { status: 400 });
  try { return NextResponse.json({ options: await getRealShippingOptions(parsed.data.cep, parsed.data.items) }); }
  catch (error) { console.error("Falha na cotação do Melhor Envio:", error); return NextResponse.json({ error: "Não foi possível consultar as transportadoras agora." }, { status: 502 }); }
}
