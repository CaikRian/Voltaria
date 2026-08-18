// Simulador de frete baseado em regra fixa por região de CEP. Sem API externa,
// sem custo, sem chave, sem dado de peso/dimensão do produto (Product não tem
// esses campos). Região = 1º dígito do CEP, mesmo agrupamento usado pelos Correios.
// Função pura: mesmo cálculo roda no client (preview) e no server (autoritativo).

export const FREE_SHIPPING_THRESHOLD_CENTS = 29900; // R$299,00 — mesmo valor da home (src/app/page.tsx)

// Decisão de produto: o frete grátis acima do limite zera SÓ o Econômico.
// O Expresso continua pago (padrão comum de mercado — dá sentido a existir
// uma opção paga mesmo em pedidos grandes). Pra zerar os dois, troque para true.
const FREE_SHIPPING_APPLIES_TO_ALL_OPTIONS = false;

export const SHIPPING_OPTION_IDS = ["economico", "expresso"] as const;
export type ShippingOptionId = (typeof SHIPPING_OPTION_IDS)[number];

export type ShippingOption = {
  id: ShippingOptionId;
  label: string;
  etaLabel: string;
  priceCents: number;
  free: boolean;
};

type RegionRule = {
  name: string;
  economicoCents: number;
  economicoEta: string;
  expressoCents: number;
  expressoEta: string;
};

// Agrupamento oficial dos Correios por 1º dígito do CEP — aproximação suficiente
// pra um simulador sem API (não reflete distância exata, só a região).
const REGIONS: Record<string, RegionRule> = {
  "0": {
    name: "São Paulo (capital/região metropolitana)",
    economicoCents: 1490,
    economicoEta: "2 a 4 dias úteis",
    expressoCents: 2690,
    expressoEta: "1 a 2 dias úteis",
  },
  "1": {
    name: "São Paulo (interior)",
    economicoCents: 1790,
    economicoEta: "3 a 5 dias úteis",
    expressoCents: 2990,
    expressoEta: "2 a 3 dias úteis",
  },
  "2": {
    name: "Rio de Janeiro / Espírito Santo",
    economicoCents: 1990,
    economicoEta: "3 a 6 dias úteis",
    expressoCents: 3290,
    expressoEta: "2 a 3 dias úteis",
  },
  "3": {
    name: "Minas Gerais",
    economicoCents: 1890,
    economicoEta: "3 a 6 dias úteis",
    expressoCents: 3190,
    expressoEta: "2 a 3 dias úteis",
  },
  "4": {
    name: "Bahia / Sergipe",
    economicoCents: 2490,
    economicoEta: "5 a 8 dias úteis",
    expressoCents: 3990,
    expressoEta: "3 a 4 dias úteis",
  },
  "5": {
    name: "Pernambuco / Alagoas / Paraíba / Rio Grande do Norte",
    economicoCents: 2590,
    economicoEta: "5 a 9 dias úteis",
    expressoCents: 4190,
    expressoEta: "3 a 5 dias úteis",
  },
  "6": {
    name: "Norte (CE, PI, MA, PA, AP, AM, RR, AC, RO)",
    economicoCents: 2990,
    economicoEta: "7 a 12 dias úteis",
    expressoCents: 4990,
    expressoEta: "4 a 6 dias úteis",
  },
  "7": {
    name: "Centro-Oeste (DF, GO, TO, MT, MS)",
    economicoCents: 2290,
    economicoEta: "5 a 8 dias úteis",
    expressoCents: 3790,
    expressoEta: "3 a 5 dias úteis",
  },
  "8": {
    name: "Paraná / Santa Catarina",
    economicoCents: 1790,
    economicoEta: "3 a 5 dias úteis",
    expressoCents: 2990,
    expressoEta: "2 a 3 dias úteis",
  },
  "9": {
    name: "Rio Grande do Sul",
    economicoCents: 2090,
    economicoEta: "4 a 7 dias úteis",
    expressoCents: 3390,
    expressoEta: "2 a 4 dias úteis",
  },
};

export function normalizeCep(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}

// Preview: chamável do client sem nenhum request de rede.
export function getShippingOptions(cep: string, subtotalCents: number): ShippingOption[] | null {
  const digits = normalizeCep(cep);
  if (!digits) return null;
  const rule = REGIONS[digits[0]];
  if (!rule) return null; // defensivo — 0-9 cobre todos os dígitos possíveis

  const qualifiesFree = subtotalCents > 0 && subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;

  return [
    {
      id: "economico",
      label: "Econômico",
      etaLabel: rule.economicoEta,
      priceCents: qualifiesFree ? 0 : rule.economicoCents,
      free: qualifiesFree,
    },
    {
      id: "expresso",
      label: "Expresso",
      etaLabel: rule.expressoEta,
      priceCents: qualifiesFree && FREE_SHIPPING_APPLIES_TO_ALL_OPTIONS ? 0 : rule.expressoCents,
      free: qualifiesFree && FREE_SHIPPING_APPLIES_TO_ALL_OPTIONS,
    },
  ];
}

// Autoritativo: chamado no server em createOrderAction. Nunca confiar em preço de
// frete vindo do client — mesmo princípio já usado no recálculo de preço de item
// via getProductsByIds, na mesma função.
export function resolveShippingCents(
  cep: string,
  subtotalCents: number,
  optionId: string
): { cents: number; option: ShippingOption } | null {
  const options = getShippingOptions(cep, subtotalCents);
  if (!options) return null;
  const option = options.find((o) => o.id === optionId);
  if (!option) return null;
  return { cents: option.priceCents, option };
}
