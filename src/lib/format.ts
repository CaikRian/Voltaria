// Dinheiro sempre em centavos (Int). Formatamos só na exibição.

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Percentual de desconto entre preço "de" e preço "por".
export function discountPercent(priceCents: number, compareCents?: number | null): number | null {
  if (!compareCents || compareCents <= priceCents) return null;
  return Math.round((1 - priceCents / compareCents) * 100);
}

// Parcelamento simples (até 12x sem juros como exemplo de UI).
export function installments(cents: number, max = 12): { count: number; cents: number } {
  const count = cents >= 20000 ? max : cents >= 10000 ? 6 : 3;
  return { count, cents: Math.round(cents / count) };
}
