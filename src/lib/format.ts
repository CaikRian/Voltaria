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

// "11991234567" -> "(11) 99123-4567" (aceita 10 ou 11 dígitos; senão devolve como veio).
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

// Link direto para o WhatsApp do cliente (assume DDI +55 — loja é BR-only).
export function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/55${digits}`;
}

// Mostra só os 2 últimos dígitos do CPF — o suficiente para conferência de suporte
// sem expor o documento completo no painel (minimização de dado, LGPD).
export function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return "***.***.***-**";
  return `***.***.**${digits.slice(9, 10)}-${digits.slice(10)}`;
}
