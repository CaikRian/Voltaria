import "server-only";
import { prisma } from "@/lib/prisma";
import { melhorEnvioFetch } from "@/lib/melhor-envio";
import { FREE_SHIPPING_THRESHOLD_CENTS, normalizeCep } from "@/lib/shipping";

export type RealShippingOption = { id: string; serviceId: string; label: string; company: string; etaLabel: string; priceCents: number; originalPriceCents: number; free: boolean };
export type ShippingCartItem = { productId: string; qty: number };
type ApiQuote = { id?: number; name?: string; price?: string; custom_price?: string; delivery_time?: number; custom_delivery_time?: number; error?: string; company?: { name?: string } };

export async function getRealShippingOptions(cep: string, items: ShippingCartItem[]): Promise<RealShippingOption[]> {
  const destination = normalizeCep(cep);
  const origin = normalizeCep(process.env.MELHOR_ENVIO_ORIGIN_CEP ?? "");
  if (!destination || !origin || !items.length) return [];
  const ids = [...new Set(items.map((item) => item.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: ids }, active: true }, select: { id: true, priceCents: true, weightGrams: true, widthCm: true, heightCm: true, lengthCm: true } });
  if (products.length !== ids.length) return [];
  const subtotalCents = items.reduce((sum, item) => sum + products.find((product) => product.id === item.productId)!.priceCents * item.qty, 0);
  const response = await melhorEnvioFetch("/api/v2/me/shipment/calculate", {
    method: "POST",
    body: JSON.stringify({
      from: { postal_code: origin }, to: { postal_code: destination },
      products: items.map((item) => { const product = products.find((candidate) => candidate.id === item.productId)!; return { id: product.id, width: product.widthCm, height: product.heightCm, length: product.lengthCm, weight: product.weightGrams / 1000, insurance_value: Number((product.priceCents / 100).toFixed(2)), quantity: item.qty }; }),
      options: { receipt: false, own_hand: false },
    }),
  });
  const data = await response.json().catch(() => null) as ApiQuote[] | null;
  if (!response.ok || !Array.isArray(data)) throw new Error(`Falha ao cotar frete (${response.status}).`);
  const options = data.flatMap((quote): RealShippingOption[] => {
    const price = Number(quote.custom_price ?? quote.price); const days = quote.custom_delivery_time ?? quote.delivery_time;
    if (!quote.id || quote.error || !Number.isFinite(price) || !Number.isFinite(days)) return [];
    const cents = Math.round(price * 100);
    return [{ id: `melhor-envio:${quote.id}`, serviceId: String(quote.id), label: quote.name ?? `Serviço ${quote.id}`, company: quote.company?.name ?? "Transportadora", etaLabel: `${days} dia${days === 1 ? " útil" : "s úteis"}`, priceCents: cents, originalPriceCents: cents, free: false }];
  }).sort((a, b) => a.priceCents - b.priceCents);
  if (subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS && options[0]) options[0] = { ...options[0], priceCents: 0, free: true };
  return options;
}

export async function resolveRealShipping(cep: string, items: ShippingCartItem[], optionId: string) {
  const options = await getRealShippingOptions(cep, items);
  const option = options.find((candidate) => candidate.id === optionId);
  return option ? { cents: option.priceCents, option } : null;
}
