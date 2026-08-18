import { MercadoPagoConfig } from "mercadopago";

// Cliente único do SDK da Mercado Pago — usa o MP_ACCESS_TOKEN de teste do .env
// (chave PRIVADA, nunca exposta ao client).
export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: { timeout: 8000 },
});

// Tradução de payment_type_id da Mercado Pago para rótulos em pt-BR — usado
// no painel e na área do cliente (mesmo vocabulário MP, uma fonte só).
export const MP_PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  ticket: "Boleto",
  bank_transfer: "Transferência",
  account_money: "Saldo Mercado Pago",
};
